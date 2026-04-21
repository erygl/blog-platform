import { EventEmitter } from "events";
import type { NotificationEventPayload } from "../types/notification.js";

class NotificationEmitter extends EventEmitter {
  emit(event: "notification", payload: NotificationEventPayload): boolean {
    return super.emit(event, payload)
  }

  on(event: "notification", listener: (payload: NotificationEventPayload) => void): this {
    return super.on(event, listener)
  }
}

const notificationEmitter = new NotificationEmitter()

export default notificationEmitter