import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Intentar parsear el JSON para obtener el mensaje amigable del backend
    try {
      const json = JSON.parse(text);
      // Si el backend envió un mensaje amigable, usarlo
      if (json.message) {
        throw new Error(json.message);
      }
      // Si hay un error pero no message, usar el error
      if (json.error) {
        throw new Error(json.error);
      }
    } catch (parseError) {
      // Si no es JSON válido, usar el texto original
    }
    
    // Fallback: usar el texto completo si no se pudo parsear
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return await res.json();
  } catch (error) {
    // Si es un error de red (Failed to fetch), proporcionar un mensaje más claro
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("No se pudo conectar con el servidor. Asegúrate de que el servidor esté corriendo.");
    }
    // Re-lanzar otros errores
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
