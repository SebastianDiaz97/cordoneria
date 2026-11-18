# Cordonería

Base técnica frontend para iniciar el desarrollo de la aplicación. No incluye
páginas ni funcionalidades de negocio.

## Comandos

- `npm run dev`: inicia el servidor local de Vite.
- `npm run build`: verifica TypeScript y genera la compilación de producción.
- `npm run lint`: ejecuta ESLint.
- `npm run typecheck`: verifica los proyectos TypeScript.
- `npm run format`: aplica Prettier.
- `npm run format:check`: comprueba el formato.

## Estilos y componentes

Los estilos globales, la tipografía Inter y los tokens de color están definidos
en `src/index.css`. Tailwind CSS v4 y los aliases de importación están
configurados para usar `@/` como acceso a `src/`.

La configuración de shadcn/ui está en `components.json`. Para agregar un
componente cuando sea necesario, se puede ejecutar `npx shadcn add <componente>`.

Las variables futuras para Supabase están listadas en `.env.example`; no hay
conexión ni configuración activa de Supabase.
