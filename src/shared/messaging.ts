import { MessageType } from './constants';

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export function sendMessage<TPayload = unknown, TResponse = unknown>(
  type: MessageType,
  payload?: TPayload
): Promise<MessageResponse<TResponse>> {
  return chrome.runtime.sendMessage({ type, payload });
}

export function sendTabMessage<TPayload = unknown, TResponse = unknown>(
  tabId: number,
  type: MessageType,
  payload?: TPayload
): Promise<MessageResponse<TResponse>> {
  return chrome.tabs.sendMessage(tabId, { type, payload });
}
