package expo.modules.launchintent

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LaunchIntentModule : Module() {
  private fun currentActivityUrl(): String? {
    return appContext.currentActivity?.intent?.dataString
      ?.trim()
      ?.takeIf { it.isNotEmpty() }
  }

  internal fun emitUrl(url: String) {
    sendEvent("onUrl", mapOf("url" to url))
  }

  override fun definition() = ModuleDefinition {
    Name("LaunchIntent")
    Events("onUrl")

    OnCreate {
      LaunchIntentStore.attach(this@LaunchIntentModule)
      LaunchIntentStore.setPendingUrl(appContext.currentActivity?.intent?.dataString)
    }

    OnDestroy {
      LaunchIntentStore.detach(this@LaunchIntentModule)
    }

    OnNewIntent { intent ->
      LaunchIntentStore.setPendingUrl(intent?.dataString)
    }

    Function("consumePendingUrl") {
      LaunchIntentStore.consumePendingUrl() ?: currentActivityUrl()
    }

    Function("peekPendingUrl") {
      LaunchIntentStore.peekPendingUrl() ?: currentActivityUrl()
    }
  }
}
