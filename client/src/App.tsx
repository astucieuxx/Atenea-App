import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import Home from "@/pages/home";
import Analysis from "@/pages/analysis";
import TesisDetail from "@/pages/tesis-detail";
import History from "@/pages/history";
import Ask from "@/pages/ask";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/ask" component={Ask} />
      <Route path="/analisis/:id" component={Analysis} />
      <Route path="/analisis/:caseId/tesis/:tesisId" component={TesisDetail} />
      <Route path="/tesis/:id" component={TesisDetail} />
      <Route path="/historial" component={History} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <Header />
            <main>
              <Router />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
