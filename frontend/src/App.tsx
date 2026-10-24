import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import BoolaEasterEgg from './components/BoolaEasterEgg'
import ChatWidget from './components/ChatWidget'
import ChatResultsShelf from './components/ChatResultsShelf'
import ScrollOnNavigate from './components/ScrollOnNavigate'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import About from './pages/About'
import Login from './pages/Login'
import CreateAccount from './pages/CreateAccount'
import NotFound from './pages/NotFound'
import { useAuth } from './useAuth'

export default function App() {
  const { user } = useAuth()
  return (
    <div className="app">
      <NavBar />
      <ScrollOnNavigate />
      <main className="main">
        {/* Product matches from the chat appear here, above whichever page is open. */}
        <ChatResultsShelf />
        <div id="page-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:productId" element={<ProductDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/create-account" element={<CreateAccount />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
      <Footer />
      {/* Keyed by user: logging in loads that shopper's saved chat; logging out clears the panel. */}
      <ChatWidget key={user?.id ?? 'guest'} />
      <BoolaEasterEgg />
    </div>
  )
}
