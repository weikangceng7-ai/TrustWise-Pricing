// SulfurAI Service Worker
// 基础离线缓存策略 - 缓存静态资源，API 请求透传

const CACHE_NAME = "sulfurai-v1"
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/agent-chat",
  "/manifest.json",
]

// 安装事件 - 预缓存关键页面
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
})

// 激活事件 - 清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
})

// 请求拦截 - 缓存优先策略（对静态资源），网络优先（对 API）
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // API 请求：网络优先，不缓存
  if (url.pathname.startsWith("/api/")) {
    return // 直接走网络
  }

  // 静态资源：缓存优先
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      return cached || fetchPromise
    })
  )
})
