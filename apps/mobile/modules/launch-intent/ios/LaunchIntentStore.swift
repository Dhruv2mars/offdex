import Foundation

final class LaunchIntentStore {
  static let shared = LaunchIntentStore()

  private weak var module: LaunchIntentModule?
  private var pendingUrl: String?

  private init() {}

  func attach(module: LaunchIntentModule) {
    self.module = module
  }

  func detach(module: LaunchIntentModule) {
    if self.module === module {
      self.module = nil
    }
  }

  func setPendingUrl(_ url: String?) {
    guard let normalized = url?.trimmingCharacters(in: .whitespacesAndNewlines), !normalized.isEmpty else {
      return
    }

    pendingUrl = normalized
    module?.emitUrl(normalized)
  }

  func peekPendingUrl() -> String? {
    return pendingUrl
  }

  func consumePendingUrl() -> String? {
    let value = pendingUrl
    pendingUrl = nil
    return value
  }
}

