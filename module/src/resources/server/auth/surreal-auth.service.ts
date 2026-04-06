// packages/pmv2shared/services/surrealdb.ts
import type { Surreal } from 'surrealdb'
import { createError } from 'h3'
import { getSurrealClient } from '../plugins/surrealdb.server'
import { LRS } from '../../utils/lrs'

export interface RecordID { tb: string; id: string }
export interface SurrealDbAuth {
  register(request: { email: string; firstName: string; surname: string; password: string; role?: string }): Promise<{ uid: string; roles: string[] }>
  login(email: string, password: string): Promise<{ uid: string; roles: string[] }>
}

export function getSurrealDb(): SurrealDbAuth {
  const db = getSurrealClient()

  return {
    async register({ email, firstName, surname, password, role }) {
      const query = `
        LET $EMAIL = string::lowercase($email);
        LET $id = type::record('u', $EMAIL);
        IF record::exists($id) THEN
          RETURN { err: "email_taken" };
        END;
        LET $role = if $role THEN $role ELSE "student" END;
        LET $user = fn::createUser({
          email: $EMAIL,
          firstName: $firstName,
          surname: $surname,
          password: $password,
          role: $role
        });

        return if($user) {
          RETURN array::first(select value id from $user);
        } else {
          RETURN false;
        }
      `

      // console.log('🗃️ here-> [SURREALDB] register Query:', query)

      const UserID = await LRS(
        await (db as Surreal).query(query, { email, password, firstName, surname, role })
      )

      // console.log('🗃️ here-> [SURREALDB] register Query result UserID:', UserID)

      if (!UserID) throw createError({ statusCode: 409, statusMessage: 'Email already registered' })

      let uid: string
      if (typeof UserID === 'object' && (UserID as any)?.tb && (UserID as any)?.id) {
        const raw = (UserID as any).id as string
        const normalized = raw.replace(/^⟨/, '').replace(/⟩$/, '').replace(/^`/, '').replace(/`$/, '')
        const idValue = normalized.includes('@') || normalized.includes('-') || normalized.includes('|')
          ? `\`${normalized}\``
          : normalized
        uid = `${(UserID as any).tb}:${idValue}`
      } else if (typeof UserID === 'string') {
        uid = UserID
      } else {
        throw new Error('Invalid ID format returned from SurrealDB')
      }

      const roles = ['student']
      return { uid, roles }
    },

    async login(email, password) {
      const query = `
        return fn::authLogin({
          email: string::lowercase($email),
          password: $password
        });
      `
      const res: any = await LRS(await (db as Surreal).query(query, { email, password }))
      if (!res || !res?.id || !res?.email) throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })

      let uid: string
      if (typeof res.id === 'object' && res.id.tb && res.id.id) {
        const raw = res.id.id as string
        const normalized = raw.replace(/^⟨/, '').replace(/⟩$/, '').replace(/^`/, '').replace(/`$/, '')
        const idValue = normalized.includes('@') || normalized.includes('-') || normalized.includes('|')
          ? `\`${normalized}\``
          : normalized
        uid = `${res.id.tb}:${idValue}`
      } else if (typeof res.id === 'string') {
        uid = res.id
      } else {
        throw new Error('Invalid ID format returned from SurrealDB')
      }

      const roles = res.role?.value ? [res.role.value] : ['student']
      return { uid, roles }
    },
  }
}
