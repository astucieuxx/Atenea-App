import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/contexts/language-context";
import { Header } from "@/components/header";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import Analysis from "@/pages/analysis";
import TesisDetail from "@/pages/tesis-detail";
import PrecedenteDetail from "@/pages/precedente-detail";
import History from "@/pages/history";
import Ask from "@/pages/ask";
import Library from "@/pages/library";
import NotFound from "@/pages/not-found";
import LogoPreview from "@/pages/logo-preview";

function RouterContent() {
  const [location] = useLocation();
  const showHeader = location !== "/";

  return (
    <>
      {showHeader && <Header />}
      <main>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/ask" component={Ask} />
          <Route path="/tesis/:id" component={TesisDetail} />
          <Route path="/precedente/:id" component={PrecedenteDetail} />
          <Route path="/historial" component={History} />
          <Route path="/biblioteca" component={Library} />
          <Route path="/logo-preview" component={LogoPreview} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              <RouterContent />
            </div>
            <Toaster />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
