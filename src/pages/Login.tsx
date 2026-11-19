import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound, Mail, ScissorsIcon } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'

const schema = z.object({
  email: z.string().min(1, 'Ingresa tu correo').email('Correo inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type FormValues = z.infer<typeof schema>

export default function Login() {
  const { session, signIn } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (session) return <Navigate to='/' replace />

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await signIn(values.email, values.password)
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'No se pudo iniciar sesión',
      )
    }
  })

  return (
    <div className='flex min-h-screen flex-col md:flex-row'>
      <div className='hidden flex-1 flex-col justify-between bg-primary p-10 text-white md:flex'>
        <div className='flex items-center gap-2'>
          <ScissorsIcon size={26} />
          <span className='text-lg font-semibold'>Cordonería</span>
        </div>
        <div className='max-w-md'>
          <h2 className='text-3xl font-semibold leading-tight text-white'>
            Ventas, inventario y arreglos en un solo lugar.
          </h2>
          <p className='mt-3 text-sm text-white/70'>
            Punto de venta, control de stock, órdenes de arreglo con seguimiento,
            caja diaria e informes del negocio.
          </p>
        </div>
        <p className='text-xs text-white/50'>
          Acceso restringido a usuarios autorizados.
        </p>
      </div>

      <div className='flex flex-1 items-center justify-center bg-background p-6'>
        <div className='w-full max-w-sm'>
          <div className='mb-6 flex items-center gap-2 md:hidden'>
            <ScissorsIcon className='text-primary' size={24} />
            <span className='text-lg font-semibold'>Cordonería</span>
          </div>
          <h1 className='text-2xl font-semibold text-text-primary'>
            Iniciar sesión
          </h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Usa el correo y la contraseña entregados por el administrador.
          </p>

          <form onSubmit={onSubmit} className='mt-6 flex flex-col gap-4'>
            <Field label='Correo' error={errors.email?.message}>
              <div className='relative'>
                <Mail className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary' />
                <Input
                  type='email'
                  autoComplete='email'
                  placeholder='correo@ejemplo.com'
                  className='pl-9'
                  {...register('email')}
                />
              </div>
            </Field>

            <Field label='Contraseña' error={errors.password?.message}>
              <div className='relative'>
                <KeyRound className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary' />
                <Input
                  type='password'
                  autoComplete='current-password'
                  placeholder='••••••••'
                  className='pl-9'
                  {...register('password')}
                />
              </div>
            </Field>

            {serverError ? (
              <p className='rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger'>
                {serverError}
              </p>
            ) : null}

            <Button type='submit' loading={isSubmitting} className='mt-1'>
              Ingresar
            </Button>
          </form>

          <p className='mt-6 text-xs text-text-secondary'>
            No existe registro público. Si necesitas acceso, solicítalo al
            administrador del negocio.
          </p>
        </div>
      </div>
    </div>
  )
}
