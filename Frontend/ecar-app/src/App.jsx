
import EnhancedAppRouter from './router/EnhancedAppRouter'
import AppErrorBoundary from './components/shared/AppErrorBoundary'
import { ToastContainer, Zoom } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function App() {
    return (
        <AppErrorBoundary>
            <>
                <EnhancedAppRouter />
                <ToastContainer
                    position="top-center"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick={false}
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="dark"
                    transition={Zoom}
                />
            </>
        </AppErrorBoundary>
  )
}

export default App
