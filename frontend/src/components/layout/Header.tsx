import { Link, useLocation } from 'react-router-dom'
import { useAuthStore, isAdmin } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { userManager } from '../../lib/oidc'

export function Header() {
  const { user } = useAuthStore()
  const cartCount = useCartStore((s) => s.count())
  const { pathname } = useLocation()
  const admin = isAdmin(user)

  const handleLogout = async () => {
    await userManager.removeUser()
    await userManager.signoutRedirect()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link
          to="/products"
          className="font-mono text-xs font-bold tracking-[0.3em] text-accent uppercase shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          CRATE
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <NavLink href="/products" active={pathname.startsWith('/products')}>
            Products
          </NavLink>
          {user && (
            <NavLink href="/orders" active={pathname.startsWith('/orders')}>
              Orders
            </NavLink>
          )}
          {admin && (
            <>
              <NavLink href="/admin/products" active={pathname.startsWith('/admin/products')}>
                Manage products
              </NavLink>
              <NavLink href="/admin/orders" active={pathname.startsWith('/admin/orders')}>
                All orders
              </NavLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {user && (
            <Link
              to="/cart"
              className="relative text-text-muted hover:text-text transition-colors p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label="Cart"
            >
              <CartIcon />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-black text-[9px] font-bold flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2.5">
              <Link
                to="/profile"
                className="text-xs text-text-muted hover:text-text max-w-[100px] truncate hidden sm:block transition-colors rounded-lg px-1 -mx-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {user.name}
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-text-muted hover:text-text border border-border hover:border-border-strong px-3 py-1.5 rounded-lg transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-xs font-semibold text-black bg-accent hover:bg-accent-dim px-4 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={href}
      className={`text-sm px-3 py-1.5 rounded-lg transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        active
          ? 'text-text bg-elevated'
          : 'text-text-muted hover:text-text hover:bg-elevated/60'
      }`}
    >
      {children}
    </Link>
  )
}

function CartIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}
