
import './App.css'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import CubeInput from './components/CubeInput'

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <CubeInput />
      </main>
    </>
  )
}

export default App
