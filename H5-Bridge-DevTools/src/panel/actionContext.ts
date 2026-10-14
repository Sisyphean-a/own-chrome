import type { Dispatch, SetStateAction } from "react";
import type {
  PanelCommand,
  PanelCommandRequest,
  PanelCommandResponse,
} from "../shared/messageTypes";
import type { AppViewState, ToastState } from "./types";

export interface PanelActionContext {
  /** 面板命令一律以内容脚本的执行结果结算，调用方只能据此宣称成功或失败。 */
  dispatchRuntimeMessage: (message: PanelCommandRequest) => Promise<PanelCommandResponse>;
  setState: Dispatch<SetStateAction<AppViewState>>;
  state: AppViewState;
  tabId: number;
}

export function postCommand(
  context: PanelActionContext,
  command: PanelCommand,
): Promise<PanelCommandResponse> {
  return context.dispatchRuntimeMessage({
    type: "PANEL_COMMAND",
    tabId: context.tabId,
    command,
  });
}

export function setToast(
  context: Pick<PanelActionContext, "setState">,
  level: ToastState["level"],
  message: string,
): void {
  context.setState((current) => ({
    ...current,
    toast: { level, message },
  }));
}
