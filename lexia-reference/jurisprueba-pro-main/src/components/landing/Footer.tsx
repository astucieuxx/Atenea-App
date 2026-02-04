import { Scale } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-16 bg-navy-dark border-t border-navy-light/30">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-silver flex items-center justify-center shadow-silver">
                <Scale className="w-5 h-5 text-navy-dark" />
              </div>
              <span className="font-display text-xl font-semibold text-primary-foreground">
                LexIA
              </span>
            </div>
            <p className="text-primary-foreground/60 font-body text-sm leading-relaxed">
              Inteligencia artificial al servicio de la justicia mexicana.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-primary-foreground mb-4">Producto</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-primary-foreground/60 hover:text-silver-light transition-colors text-sm">Características</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-silver-light transition-colors text-sm">Precios</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-silver-light transition-colors text-sm">Integraciones</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-silver-light transition-colors text-sm">API</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary-foreground mb-4">Empresa</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-primary-foreground/60 hover:text-silver-light transition-colors text-sm">Nosotros</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-silver-light transition-colors text-sm">Blog</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-silver-light transition-colors text-sm">Carreras</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-silver-light transition-colors text-sm">Contacto</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary-foreground mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-primary-foreground/60 hover:text-silver-light transition-colors text-sm">Términos de Servicio</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-silver-light transition-colors text-sm">Privacidad</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-silver-light transition-colors text-sm">Aviso Legal</a></li>
              <li><a href="#" className="text-primary-foreground/60 hover:text-silver-light transition-colors text-sm">LFPDPPP</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-navy-light/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/50 text-sm font-body">
            © 2024 LexIA. Todos los derechos reservados.
          </p>
          <p className="text-primary-foreground/40 text-sm font-body">
            Hecho con 🇲🇽 en México
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
