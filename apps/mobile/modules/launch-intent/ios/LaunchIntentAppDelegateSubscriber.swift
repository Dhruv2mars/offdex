import ExpoModulesCore
import UIKit

public class LaunchIntentAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if let url = launchOptions?[.url] as? URL {
      LaunchIntentStore.shared.setPendingUrl(url.absoluteString)
    }
    return false
  }

  public func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    LaunchIntentStore.shared.setPendingUrl(url.absoluteString)
    return false
  }
}
