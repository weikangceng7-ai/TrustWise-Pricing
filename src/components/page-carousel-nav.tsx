"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

interface PageCarouselNavProps {
  /**
   * 总页面数量
   */
  totalPages: number
  /**
   * 是否自动播放
   */
  autoPlay?: boolean
  /**
   * 自动播放间隔时间（毫秒）
   */
  interval?: number
  /**
   * 当前页面索引变化时的回调
   */
  onPageChange?: (index: number) => void
  /**
   * 初始页面索引
   */
  initialPage?: number
  /**
   * 自定义类名
   */
  className?: string
  /**
   * 指示点激活时的颜色类
   */
  activeColor?: string
  /**
   * 是否显示箭头按钮
   */
  showArrows?: boolean
  /**
   * 是否显示指示点
   */
  showIndicators?: boolean
  /**
   * 箭头按钮样式
   */
  arrowButtonClassName?: string
}

export function PageCarouselNav({
  totalPages,
  autoPlay = false,
  interval = 5000,
  onPageChange,
  initialPage = 0,
  className = "",
  activeColor = "bg-cyan-500",
  showArrows = true,
  showIndicators = true,
  arrowButtonClassName = "",
}: PageCarouselNavProps) {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isPaused, setIsPaused] = useState(false)

  // 自动播放逻辑
  useEffect(() => {
    if (!autoPlay || isPaused || totalPages <= 1) return

    const timer = setInterval(() => {
      setCurrentPage((prev) => {
        const next = (prev + 1) % totalPages
        onPageChange?.(next)
        return next
      })
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, interval, totalPages, isPaused, onPageChange])

  // 切换到指定页面
  const goToPage = useCallback((index: number) => {
    setIsPaused(true)
    setCurrentPage(index)
    onPageChange?.(index)
  }, [onPageChange])

  // 切换到上一页
  const goToPrevious = useCallback(() => {
    setIsPaused(true)
    const prevPage = (currentPage - 1 + totalPages) % totalPages
    setCurrentPage(prevPage)
    onPageChange?.(prevPage)
  }, [currentPage, totalPages, onPageChange])

  // 切换到下一页
  const goToNext = useCallback(() => {
    setIsPaused(true)
    const nextPage = (currentPage + 1) % totalPages
    setCurrentPage(nextPage)
    onPageChange?.(nextPage)
  }, [currentPage, totalPages, onPageChange])

  // 重置自动播放（用户停止交互后）
  const handleMouseLeave = useCallback(() => {
    if (autoPlay) {
      // 延迟恢复自动播放
      const timer = setTimeout(() => {
        setIsPaused(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [autoPlay])

  if (totalPages <= 1) return null

  const { t } = useLanguage()

  return (
    <div
      className={`flex items-center justify-center gap-2 ${className}`}
      onMouseLeave={handleMouseLeave}
    >
      {/* 左箭头 */}
      {showArrows && (
        <button
          onClick={goToPrevious}
          className={`p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 hover:scale-105 active:scale-95 ${arrowButtonClassName}`}
          aria-label={t("pageCarousel.prevPage")}
        >
          <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </button>
      )}

      {/* 页面指示器 */}
      {showIndicators && (
        <div className="flex items-center gap-1.5 px-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToPage(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentPage === index
                  ? `w-6 ${activeColor}`
                  : "w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
              }`}
              aria-label={`${t("pageCarousel.goToPagePrefix")}${index + 1}${t("pageCarousel.goToPageSuffix")}`}
              aria-current={currentPage === index ? "page" : undefined}
            />
          ))}
        </div>
      )}

      {/* 右箭头 */}
      {showArrows && (
        <button
          onClick={goToNext}
          className={`p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 hover:scale-105 active:scale-95 ${arrowButtonClassName}`}
          aria-label={t("pageCarousel.nextPage")}
        >
          <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </button>
      )}
    </div>
  )
}

/**
 * 带有页面内容和导航栏的完整轮播组件
 */
interface PageCarouselProps {
  /**
   * 页面内容数组
   */
  pages: React.ReactNode[]
  /**
   * 是否自动播放
   */
  autoPlay?: boolean
  /**
   * 自动播放间隔时间（毫秒）
   */
  interval?: number
  /**
   * 初始页面索引
   */
  initialPage?: number
  /**
   * 自定义类名（容器）
   */
  containerClassName?: string
  /**
   * 自定义类名（内容区域）
   */
  contentClassName?: string
  /**
   * 自定义类名（导航栏）
   */
  navClassName?: string
  /**
   * 导航栏指示点激活颜色
   */
  navActiveColor?: string
  /**
   * 是否将导航栏固定在底部
   */
  fixedNav?: boolean
  /**
   * 是否显示箭头按钮
   */
  showArrows?: boolean
}

export function PageCarousel({
  pages,
  autoPlay = false,
  interval = 5000,
  initialPage = 0,
  containerClassName = "",
  contentClassName = "",
  navClassName = "",
  navActiveColor = "bg-cyan-500",
  fixedNav = false,
  showArrows = true,
}: PageCarouselProps) {
  const [currentPage, setCurrentPage] = useState(initialPage)

  const handlePageChange = (index: number) => {
    setCurrentPage(index)
  }

  return (
    <div className={`relative ${containerClassName}`}>
      {/* 内容区域 */}
      <div className={`overflow-hidden ${contentClassName}`}>
        {pages.map((page, index) => (
          <div
            key={index}
            className={`transition-opacity duration-300 ${
              currentPage === index
                ? "opacity-100 visible"
                : "opacity-0 invisible absolute inset-0"
            }`}
          >
            {page}
          </div>
        ))}
      </div>

      {/* 导航栏 */}
      <div
        className={
          fixedNav
            ? "fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 py-3 z-50"
            : "mt-3"
        }
      >
        <PageCarouselNav
          totalPages={pages.length}
          autoPlay={autoPlay}
          interval={interval}
          onPageChange={handlePageChange}
          initialPage={initialPage}
          className={navClassName}
          activeColor={navActiveColor}
          showArrows={showArrows}
        />
      </div>
    </div>
  )
}