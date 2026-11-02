import type {
  BridgePanelSnapshot,
  BridgeStorageState,
  OriginBridgeProfileState,
  OriginScopedBridgeState,
} from "./bridgeTypes";
import {
  BRIDGE_PROFILES,
  DEFAULT_BRIDGE_PROFILE_ID,
  getBuiltInBridgeProfile,
  getBridgeProfile,
  normalizeBridgeProfile,
  type BridgeProfile,
  type BridgeProfileId,
} from "./bridgeProfiles";
import { cloneJson } from "./json";
import { migrateStorageState, type LegacyStorageState } from "./migrate";
import { getPresetSenders } from "./presets";
import {
  mergeImportedSenders,
  normalizeResponseSelection,
  normalizeSenders as normalizeSenderCollection,
} from "./rules";
import type { RulePackage } from "./rulePackage";
import type { ImportStrategy, OriginBridgeSettings } from "./ruleTypes";
import type { BridgeSender } from "./senderTypes";
import { GLOBAL_LIBRARY_KEY, LEGACY_STORAGE_KEY, MIGRATION_SOURCE_ORIGIN, STORAGE_KEY } from "./constants";

export const DEFAULT_SETTINGS: OriginBridgeSettings = {
  autoMock: true,
  preserveLogs: false,
  maxLogCount: 200,
  overrideExistingBridge: true,
};

export function createDefaultProfileState(profileId: BridgeProfileId): OriginBridgeProfileState {
  return {
    senders: getBuiltInBridgeProfile(profileId) ? getPresetSenders(profileId) : [],
    logs: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function createDefaultOriginState(): OriginScopedBridgeState {
  return {
    activeProfileId: DEFAULT_BRIDGE_PROFILE_ID,
    profileDefinitions: Object.fromEntries(
      BRIDGE_PROFILES.map((profile) => [profile.id, { ...profile }]),
    ),
    knownHostObjects: BRIDGE_PROFILES.map((profile) => profile.hostObject),
    profiles: Object.fromEntries(
      BRIDGE_PROFILES.map((profile) => [profile.id, createDefaultProfileState(profile.id)]),
    ),
  };
}

export async function readStorageState(): Promise<BridgeStorageState> {
  const snapshot = await readStorageStateRaw();
  if (snapshot) {
    return normalizeStorageState(snapshot);
  }

  const migrated = await migrateLegacyState();
  return normalizeStorageState(migrated);
}

/**
 * 未经归一化的原始读取，供内部读改写路径使用：
 * 扩展是本键的唯一写入方，写入的始终是归一化形状。
 */
export async function readStorageStateRaw(): Promise<BridgeStorageState | undefined> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return stored[STORAGE_KEY] as BridgeStorageState | undefined;
}

/**
 * 写路径保留旧站点切片原样；首次创建全局库时仅归一化指定来源的副本。
 */
export async function readStorageStateForWrite(): Promise<BridgeStorageState> {
  const raw = await readStorageStateRaw();
  return withGlobalLibrary(raw ?? await migrateLegacyState() ?? { globalEnabled: true, origins: {} });
}

async function migrateLegacyState(): Promise<BridgeStorageState | undefined> {
  const legacyStored = await chrome.storage.local.get(LEGACY_STORAGE_KEY);
  const legacy = legacyStored[LEGACY_STORAGE_KEY] as LegacyStorageState | undefined;
  if (!legacy) {
    return undefined;
  }

  const migrated = migrateStorageState(legacy);
  await writeStorageState(migrated);
  try {
    await chrome.storage.local.remove(LEGACY_STORAGE_KEY);
  } catch {
    // 旧键残留只会让下次读取重复迁移，结果幂等
  }
  return migrated;
}

export async function writeStorageState(state: BridgeStorageState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export function withGlobalLibrary(state: BridgeStorageState): BridgeStorageState {
  if (state.origins[GLOBAL_LIBRARY_KEY]) return state;
  const source = state.origins[MIGRATION_SOURCE_ORIGIN];
  if (!source && Object.keys(state.origins).length > 0) {
    throw new Error(`未找到迁移来源 ${MIGRATION_SOURCE_ORIGIN}，原有站点数据未修改`);
  }
  return {
    ...state,
    origins: { ...state.origins, [GLOBAL_LIBRARY_KEY]: normalizeOriginState(source) },
  };
}

export async function ensureOriginState(_origin: string): Promise<BridgeStorageState> {
  const raw = await readStorageStateRaw();
  if (raw?.origins?.[GLOBAL_LIBRARY_KEY]) return normalizeStorageState(raw);
  const response = await chrome.runtime.sendMessage({ type: "ENSURE_GLOBAL_LIBRARY" }) as { ok: boolean; message?: string } | undefined;
  if (!response?.ok) throw new Error(response?.message ?? "全局方案库初始化失败");
  const initialized = await readStorageStateRaw();
  if (!initialized?.origins?.[GLOBAL_LIBRARY_KEY]) throw new Error("全局方案库未写入存储");
  return normalizeStorageState(initialized);
}

export async function buildSnapshot(origin: string, href: string): Promise<BridgePanelSnapshot> {
  const { globalEnabled, originState } = await readOriginScopedState(origin);
  const profileState = getActiveProfileState(originState);
  const activeProfile = getOriginProfile(originState, originState.activeProfileId);
  return {
    origin,
    href,
    globalEnabled,
    activeProfileId: originState.activeProfileId,
    activeProfile,
    profiles: Object.values(originState.profileDefinitions).map((profile) => ({ ...profile })),
    senders: cloneJson(profileState.senders),
    logs: cloneJson(profileState.logs),
    settings: { ...profileState.settings },
  };
}

export async function readOriginScopedState(
  origin: string,
): Promise<{ globalEnabled: boolean; originState: OriginScopedBridgeState }> {
  const state = await ensureOriginState(origin);
  return {
    globalEnabled: state.globalEnabled ?? true,
    originState: cloneJson(state.origins[GLOBAL_LIBRARY_KEY]),
  };
}

export async function updateStorageState(
  updater: (state: BridgeStorageState) => BridgeStorageState,
): Promise<BridgeStorageState> {
  const currentState = await readStorageState();
  const nextState = updater(currentState);
  await writeStorageState(nextState);
  return nextState;
}

export function createRulePackageExport(
  name: string,
  profile: BridgeProfile,
  state: OriginBridgeProfileState,
): RulePackage {
  return {
    version: 1,
    name,
    profile: { ...profile },
    settings: { ...state.settings },
    senders: cloneJson(state.senders),
  };
}

export function getOriginProfile(
  originState: OriginScopedBridgeState,
  profileId: string,
): BridgeProfile {
  return normalizeBridgeProfile(originState.profileDefinitions[profileId]) ?? getBridgeProfile(profileId);
}

export function importRulePackageIntoOriginState(
  originState: OriginScopedBridgeState,
  rulePackage: RulePackage,
  strategy: ImportStrategy,
): OriginScopedBridgeState {
  const profileId = rulePackage.profile.id;
  const currentProfile =
    originState.profiles[profileId] ?? createDefaultProfileState(profileId);
  return {
    ...originState,
    activeProfileId: profileId,
    profileDefinitions: {
      ...originState.profileDefinitions,
      [profileId]: { ...rulePackage.profile },
    },
    knownHostObjects: Array.from(
      new Set([...originState.knownHostObjects, rulePackage.profile.hostObject]),
    ),
    profiles: {
      ...originState.profiles,
      [profileId]: {
        ...currentProfile,
        senders: mergeImportedSenders(currentProfile.senders, rulePackage.senders, strategy),
        settings: { ...currentProfile.settings, ...rulePackage.settings },
      },
    },
  };
}

function normalizeStorageState(input: BridgeStorageState | undefined): BridgeStorageState {
  if (!input) {
    return { globalEnabled: true, origins: {} };
  }

  return {
    globalEnabled: input.globalEnabled ?? true,
    origins: normalizeOrigins(input.origins ?? {}),
  };
}

function normalizeOrigins(
  origins: Record<string, OriginScopedBridgeState | OriginBridgeProfileState>,
): Record<string, OriginScopedBridgeState> {
  return Object.fromEntries(
    Object.entries(origins).map(([origin, state]) => [origin, normalizeOriginState(state)]),
  );
}

function normalizeOriginState(
  state: OriginScopedBridgeState | OriginBridgeProfileState | undefined,
): OriginScopedBridgeState {
  if (!state) {
    return createDefaultOriginState();
  }

  if (!isScopedOriginState(state)) {
    const defaults = createDefaultOriginState();
    return {
      ...defaults,
      profiles: {
        ...defaults.profiles,
        pkg01: normalizeProfileState(state, "pkg01"),
      },
    };
  }

  const rawDefinitions = state.profileDefinitions ?? {};
  const definitions: Record<string, BridgeProfile> = Object.fromEntries(
    Object.entries(rawDefinitions).flatMap(([profileId, definition]) => {
      const profile = normalizeBridgeProfile(definition);
      return profile ? [[profileId, profile]] : [];
    }),
  );
  const profiles: Record<string, OriginBridgeProfileState> = {};
  for (const [profileId, profileState] of Object.entries(state.profiles ?? {})) {
    const profile = definitions[profileId] ?? getBuiltInBridgeProfile(profileId);
    if (!profile) {
      continue;
    }
    definitions[profileId] = profile;
    profiles[profileId] = normalizeProfileState(profileState, profileId);
  }

  for (const profile of BRIDGE_PROFILES) {
    definitions[profile.id] ??= { ...profile };
    profiles[profile.id] ??= createDefaultProfileState(profile.id);
  }

  const activeProfileId = profiles[state.activeProfileId] ? state.activeProfileId : DEFAULT_BRIDGE_PROFILE_ID;
  // 只保留仍出现在方案定义里的宿主对象：被替换/删除方案遗留的宿主无法再被管理。
  const knownHostObjects = Array.from(
    new Set(Object.values(definitions).map((profile) => profile.hostObject)),
  );
  return { activeProfileId, profileDefinitions: definitions, knownHostObjects, profiles };
}

function normalizeProfileState(
  state: Partial<OriginBridgeProfileState> | undefined,
  profileId: BridgeProfileId,
): OriginBridgeProfileState {
  return {
    senders: normalizeSenders(state?.senders ?? createDefaultProfileState(profileId).senders),
    logs: cloneJson(state?.logs ?? []),
    settings: normalizeSettings(state?.settings),
  };
}

function normalizeSettings(
  settings: Partial<OriginBridgeSettings & { overrideExistingAndroidBridge?: boolean }> | undefined,
): OriginBridgeSettings {
  const { overrideExistingAndroidBridge: legacyOverride, ...cleanSettings } = settings ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...cleanSettings,
    overrideExistingBridge:
      cleanSettings.overrideExistingBridge ?? legacyOverride ?? DEFAULT_SETTINGS.overrideExistingBridge,
  };
}

function getActiveProfileState(originState: OriginScopedBridgeState): OriginBridgeProfileState {
  return (
    originState.profiles[originState.activeProfileId] ??
    createDefaultProfileState(originState.activeProfileId)
  );
}

function isScopedOriginState(state: unknown): state is OriginScopedBridgeState {
  return typeof state === "object" && state !== null && "profiles" in state;
}

function normalizeSenders(senders: BridgeSender[]): BridgeSender[] {
  return normalizeSenderCollection(
    senders.map((sender) => {
      const responses = cloneJson(sender.responses ?? []);
      const legacySender = sender as BridgeSender & {
        enabled?: boolean;
        lastActiveResponseId?: string | null;
      };
      const legacyEnabled = legacySender.enabled ?? true;
      const nextSelection = normalizeResponseSelection(
        responses,
        legacyEnabled ? sender.activeResponseId : null,
        legacySender.lastActiveResponseId ?? sender.activeResponseId,
      );
      return {
        id: sender.id,
        name: sender.name,
        matchEvent: sender.matchEvent,
        responses,
        ...nextSelection,
        meta: sender.meta,
      };
    }),
  );
}
