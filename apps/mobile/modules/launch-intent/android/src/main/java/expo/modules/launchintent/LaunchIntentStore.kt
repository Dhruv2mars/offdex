package expo.modules.launchintent

object LaunchIntentStore {
  private var pendingUrl: String? = null
  private var module: LaunchIntentModule? = null

  fun attach(module: LaunchIntentModule) {
    this.module = module
  }

  fun detach(module: LaunchIntentModule) {
    if (this.module === module) {
      this.module = null
    }
  }

  fun setPendingUrl(url: String?) {
    val normalized = url?.trim()?.takeIf { it.isNotEmpty() } ?: return
    pendingUrl = normalized
    module?.emitUrl(normalized)
  }

  fun peekPendingUrl(): String? {
    return pendingUrl
  }

  fun consumePendingUrl(): String? {
    val value = pendingUrl
    pendingUrl = null
    return value
  }
}
