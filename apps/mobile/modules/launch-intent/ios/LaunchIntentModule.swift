import ExpoModulesCore

public class LaunchIntentModule: Module {
  internal func emitUrl(_ url: String) {
    sendEvent("onUrl", [
      "url": url
    ])
  }

  public func definition() -> ModuleDefinition {
    Name("LaunchIntent")
    Events("onUrl")

    OnCreate {
      LaunchIntentStore.shared.attach(module: self)
    }

    OnDestroy {
      LaunchIntentStore.shared.detach(module: self)
    }

    Function("consumePendingUrl") {
      return LaunchIntentStore.shared.consumePendingUrl()
    }

    Function("peekPendingUrl") {
      return LaunchIntentStore.shared.peekPendingUrl()
    }
  }
}
