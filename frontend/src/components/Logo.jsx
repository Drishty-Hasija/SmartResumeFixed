import { Link } from 'react-router-dom'
import { cx } from '../utils/format'

/**
 * The brand mark (public/logo-mark.png), drawn as a CSS mask so it takes the current
 * theme's ink colour and stays readable in both light and dark mode.
 */
export function LogoMark({ size = 34, className }) {
  const url = `${import.meta.env.BASE_URL}logo-mark.png`
  return (
    <span
      aria-hidden
      className={cx('inline-block shrink-0 bg-ink', className)}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  )
}

export default function Logo({ to = '/', compact = false, className }) {
  return (
    <Link to={to} className={cx('inline-flex items-center gap-2 font-semibold tracking-tight text-ink no-underline', className)} aria-label="SmartResume home">
      <LogoMark />
      {!compact && <span className="text-[1.0625rem]">SmartResume</span>}
    </Link>
  )
}
