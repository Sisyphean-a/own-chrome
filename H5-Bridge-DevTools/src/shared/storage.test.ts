import { describe, expect, it } from "vitest";
import {
  createDefaultOriginState,
  getOriginProfile,
  importRulePackageIntoOriginState,
  withGlobalLibrary,
} from "./storage";
import { GLOBAL_LIBRARY_KEY, MIGRATION_SOURCE_ORIGIN } from "./constants";
import type { RulePackage } from "./rulePackage";

const rulePackage: RulePackage = {
  version: 1,
  name: "客户 Demo",
  profile: {
    id: "customer-demo",
    title: "客户 Demo",
    hostObject: "CustomerBridge",
    requestEventField: "event",
  },
  settings: { autoMock: false, maxLogCount: 50 },
  senders: [
    {
      id: "login",
      name: "登录",
      matchEvent: "login",
      activeResponseId: "login-ok",
      lastActiveResponseId: "login-ok",
      responses: [
        {
          id: "login-ok",
          name: "成功",
          delayMs: 0,
          mode: "dispatchEvent",
          eventName: "login",
          detail: { success: true },
        },
      ],
    },
  ],
};

describe("全局方案库迁移", () => {
  it("使用指定本地站点初始化，保留所有旧站点数据并隔离副本", () => {
    const local = importRulePackageIntoOriginState(createDefaultOriginState(), rulePackage, "replace");
    const other = createDefaultOriginState();
    const old = { globalEnabled: true, origins: { [MIGRATION_SOURCE_ORIGIN]: local, "https://example.com": other } };
    const migrated = withGlobalLibrary(old);
    expect(migrated.origins[GLOBAL_LIBRARY_KEY].profiles["customer-demo"].senders).toEqual(local.profiles["customer-demo"].senders);
    expect(migrated.origins[MIGRATION_SOURCE_ORIGIN]).toBe(local);
    expect(migrated.origins["https://example.com"]).toBe(other);
    migrated.origins[GLOBAL_LIBRARY_KEY].profiles["customer-demo"].senders[0].name = "修改";
    expect(local.profiles["customer-demo"].senders[0].name).toBe("登录");
    expect(withGlobalLibrary(migrated)).toBe(migrated);
  });

  it("旧数据存在但找不到来源时拒绝迁移；全新安装使用默认方案", () => {
    const existing = { globalEnabled: true, origins: { "https://example.com": createDefaultOriginState() } };
    expect(() => withGlobalLibrary(existing)).toThrow("未找到迁移来源");
    expect(existing.origins).not.toHaveProperty(GLOBAL_LIBRARY_KEY);
    expect(withGlobalLibrary({ globalEnabled: true, origins: {} }).origins[GLOBAL_LIBRARY_KEY]).toBeDefined();
  });
});

describe("规则包存储", () => {
  it("导入新规则包会注册动态方案、切换当前方案并应用设置", () => {
    const initial = createDefaultOriginState();
    const next = importRulePackageIntoOriginState(initial, rulePackage, "replace");

    expect(next.activeProfileId).toBe("customer-demo");
    expect(next.profileDefinitions["customer-demo"]).toEqual(rulePackage.profile);
    expect(next.knownHostObjects).toContain("CustomerBridge");
    expect(next.profiles["customer-demo"]).toMatchObject({
      settings: { autoMock: false, maxLogCount: 50 },
      senders: [{ matchEvent: "login" }],
    });
    expect(next.profiles.pkg01).toBe(initial.profiles.pkg01);
  });

  it("读取旧方案定义时默认使用 event 作为请求事件字段", () => {
    const state = createDefaultOriginState();
    state.profileDefinitions.legacy = {
      id: "legacy",
      title: "旧方案",
      hostObject: "LegacyBridge",
    };

    expect(getOriginProfile(state, "legacy").requestEventField).toBe("event");
  });

  it("更新同一方案时会保留旧宿主以便注入端恢复旧 mock", () => {
    const first = importRulePackageIntoOriginState(createDefaultOriginState(), rulePackage, "replace");
    const updated = importRulePackageIntoOriginState(
      first,
      { ...rulePackage, profile: { ...rulePackage.profile, hostObject: "UpdatedBridge" } },
      "replace",
    );

    expect(updated.knownHostObjects).toEqual(
      expect.arrayContaining(["CustomerBridge", "UpdatedBridge"]),
    );
  });
});
