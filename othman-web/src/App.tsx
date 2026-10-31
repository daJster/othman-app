import { BrowserRouter, useRoutes } from 'react-router-dom';

import { routes } from '@/router';
import { AuthProvider, ThemeProvider } from '@/providers';

const AppRoutes = () => {
    return useRoutes(routes);
};

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
