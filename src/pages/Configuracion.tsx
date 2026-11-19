import { useState } from 'react'
import { Info, Save, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { useAsync } from '@/hooks/useAsync'
import {
  getBusinessSettings,
  updateBusinessSettings,
} from '@/services/catalog'
import { listProfiles, updateProfile } from '@/services/users'
import type { BusinessSettingsInput } from '@/services/catalog'
import type { Role } from '@/types'
import { formatCurrency } from '@/lib/format'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Input'
import {
  ErrorBlock,
  LoadingBlock,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/States'

const emptySettings: BusinessSettingsInput = {
  business_name: '',
  currency_code: 'CLP',
  timezone: 'America/Santiago',
  storage_grace_days: 0,
  storage_fee_mode: 'none',
  storage_fee_amount: 0,
  allow_negative_stock: false,
}

export default function Configuracion() {
  const { isAdmin, profile: currentProfile } = useAuth()
  const [draft, setDraft] = useState<BusinessSettingsInput | null>(null)
  const [saving, setSaving] = useState(false)

  const settingsQuery = useAsync(() => getBusinessSettings(), [])
  const usersQuery = useAsync(
    () => (isAdmin ? listProfiles() : Promise.resolve([])),
    [isAdmin],
  )

  const form: BusinessSettingsInput = draft ??
    (settingsQuery.data
      ? {
          business_name: settingsQuery.data.business_name,
          currency_code: settingsQuery.data.currency_code,
          timezone: settingsQuery.data.timezone,
          storage_grace_days: settingsQuery.data.storage_grace_days,
          storage_fee_mode: settingsQuery.data.storage_fee_mode,
          storage_fee_amount: Number(settingsQuery.data.storage_fee_amount),
          allow_negative_stock: settingsQuery.data.allow_negative_stock,
        }
      : emptySettings)

  function set<K extends keyof BusinessSettingsInput>(
    key: K,
    value: BusinessSettingsInput[K],
  ) {
    setDraft({ ...form, [key]: value })
  }

  async function saveSettings() {
    if (!isAdmin) return
    setSaving(true)
    try {
      await updateBusinessSettings({
        ...form,
        business_name: form.business_name.trim() || 'Cordonería',
        storage_grace_days: Number(form.storage_grace_days) || 0,
        storage_fee_amount: Number(form.storage_fee_amount) || 0,
      })
      toast.success('Configuración guardada')
      setDraft(null)
      settingsQuery.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function changeRole(userId: string, role: Role) {
    try {
      await updateProfile(userId, { role })
      toast.success('Rol actualizado')
      usersQuery.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar')
    }
  }

  async function toggleActive(userId: string, isActive: boolean) {
    if (userId === currentProfile?.id) {
      toast.error('No puedes desactivar tu propio usuario')
      return
    }
    try {
      await updateProfile(userId, { is_active: !isActive })
      toast.success(isActive ? 'Usuario desactivado' : 'Usuario activado')
      usersQuery.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar')
    }
  }

  if (settingsQuery.loading) return <LoadingBlock label='Cargando configuración…' />
  if (settingsQuery.error)
    return <ErrorBlock message={settingsQuery.error} onRetry={settingsQuery.reload} />

  return (
    <div>
      <PageHeader
        title='Configuración'
        description='Datos del negocio, almacenamiento y usuarios'
        actions={
          isAdmin ? (
            <Button loading={saving} onClick={saveSettings}>
              <Save className='h-4 w-4' /> Guardar cambios
            </Button>
          ) : null
        }
      />

      {!isAdmin ? (
        <div className='mb-4 flex items-start gap-2 rounded-lg bg-info/10 px-3 py-2 text-sm text-info'>
          <Info className='mt-0.5 h-4 w-4 shrink-0' />
          Solo un administrador puede modificar la configuración y los usuarios.
        </div>
      ) : null}

      <div className='grid gap-4 xl:grid-cols-2'>
        <section className='rounded-xl border border-border bg-surface shadow-soft'>
          <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
            Negocio
          </h2>
          <div className='grid gap-3 p-4 sm:grid-cols-2'>
            <Field label='Nombre del negocio' className='sm:col-span-2'>
              <Input
                value={form.business_name}
                disabled={!isAdmin}
                onChange={(event) => set('business_name', event.target.value)}
              />
            </Field>
            <Field label='Moneda'>
              <Input
                value={form.currency_code}
                disabled={!isAdmin}
                onChange={(event) => set('currency_code', event.target.value)}
              />
            </Field>
            <Field
              label='Zona horaria'
              hint='Fija por ahora; se habilitará más adelante'
            >
              <Input value={form.timezone} disabled />
            </Field>
            <label className='flex items-center gap-2 text-sm sm:col-span-2'>
              <input
                type='checkbox'
                className='h-4 w-4 accent-primary'
                checked={form.allow_negative_stock}
                disabled={!isAdmin}
                onChange={(event) =>
                  set('allow_negative_stock', event.target.checked)
                }
              />
              Permitir vender con stock negativo
            </label>
          </div>
        </section>

        <section className='rounded-xl border border-border bg-surface shadow-soft'>
          <h2 className='border-b border-border px-4 py-3 text-sm font-semibold'>
            Almacenamiento de prendas
          </h2>
          <div className='grid gap-3 p-4 sm:grid-cols-2'>
            <Field label='Días de gracia'>
              <Input
                type='number'
                min={0}
                value={form.storage_grace_days}
                disabled={!isAdmin}
                onChange={(event) =>
                  set('storage_grace_days', Number(event.target.value) || 0)
                }
              />
            </Field>
            <Field label='Modalidad de cobro'>
              <Select
                value={form.storage_fee_mode}
                disabled={!isAdmin}
                onChange={(event) =>
                  set(
                    'storage_fee_mode',
                    event.target.value as BusinessSettingsInput['storage_fee_mode'],
                  )
                }
              >
                <option value='none'>Sin cobro</option>
                <option value='per_day'>Por día</option>
                <option value='fixed'>Monto fijo</option>
              </Select>
            </Field>
            <Field label='Monto de cobro'>
              <Input
                type='number'
                min={0}
                value={form.storage_fee_amount}
                disabled={!isAdmin || form.storage_fee_mode === 'none'}
                onChange={(event) =>
                  set('storage_fee_amount', Number(event.target.value) || 0)
                }
              />
            </Field>
            <p className='self-end text-xs text-text-secondary sm:col-span-2'>
              Cobro configurado:{' '}
              <strong className='text-text-primary'>
                {form.storage_fee_mode === 'none'
                  ? 'Sin cobro'
                  : form.storage_fee_mode === 'per_day'
                    ? `${formatCurrency(form.storage_fee_amount)} por día`
                    : `${formatCurrency(form.storage_fee_amount)} fijo`}
              </strong>{' '}
              después de {form.storage_grace_days} días de gracia. Las prendas ya
              recibidas conservan la configuración que tenían al ingresar.
            </p>
          </div>
        </section>
      </div>

      <section className='mt-4 rounded-xl border border-border bg-surface shadow-soft'>
        <h2 className='flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold'>
          <ShieldCheck className='h-4 w-4' /> Usuarios
        </h2>
        {!isAdmin ? (
          <p className='p-4 text-sm text-text-secondary'>
            La administración de usuarios está disponible solo para
            administradores.
          </p>
        ) : usersQuery.loading ? (
          <LoadingBlock />
        ) : usersQuery.error ? (
          <ErrorBlock message={usersQuery.error} onRetry={usersQuery.reload} />
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Nombre</Th>
                  <Th>Rol</Th>
                  <Th>Estado</Th>
                  <Th className='text-right'>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {(usersQuery.data ?? []).map((user) => (
                  <tr key={user.id}>
                    <Td>
                      <p className='font-medium'>
                        {user.full_name || 'Sin nombre'}
                        {user.id === currentProfile?.id ? (
                          <Badge tone='info' className='ml-2'>
                            Tú
                          </Badge>
                        ) : null}
                      </p>
                    </Td>
                    <Td>
                      <Select
                        className='h-9 w-36 text-xs'
                        value={user.role}
                        disabled={user.id === currentProfile?.id}
                        onChange={(event) =>
                          changeRole(user.id, event.target.value as Role)
                        }
                      >
                        <option value='employee'>Empleado</option>
                        <option value='admin'>Administrador</option>
                      </Select>
                    </Td>
                    <Td>
                      <Badge tone={user.is_active ? 'success' : 'danger'}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </Td>
                    <Td>
                      <div className='flex justify-end'>
                        <Button
                          variant='ghost'
                          size='sm'
                          disabled={user.id === currentProfile?.id}
                          onClick={() => toggleActive(user.id, user.is_active)}
                        >
                          {user.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <p className='flex items-start gap-2 border-t border-border px-4 py-3 text-xs text-text-secondary'>
              <Info className='mt-0.5 h-3.5 w-3.5 shrink-0' />
              Los usuarios se crean desde el panel de Supabase Authentication.
              El correo no se almacena en la tabla de perfiles: gestiónalo allí.
              Al crear un usuario queda inactivo hasta que lo actives aquí.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
