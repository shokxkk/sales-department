'use client'

import { Users } from 'lucide-react'

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Фойдаланувчилар</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Тизим фойдаланувчилари ва уларнинг роллари</p>
      </div>

      <div className="glass-card rounded-2xl p-6 border border-border space-y-4">
        <h3 className="font-bold text-foreground text-base">Фойдаланувчилар рўйхати</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 font-semibold">Фойдаланувчи</th>
                <th className="pb-3 font-semibold">Роли</th>
                <th className="pb-3 font-semibold">Ҳолати</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/10">
                <td className="py-3 text-foreground font-medium">Администратор (admin@demo.uz)</td>
                <td className="py-3 text-foreground">COMPANY_ADMIN</td>
                <td className="py-3">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border badge-success">Фаол</span>
                </td>
              </tr>
              <tr className="hover:bg-muted/10">
                <td className="py-3 text-foreground font-medium">Руководитель отдела продаж (rop@demo.uz)</td>
                <td className="py-3 text-foreground">SALES_DIRECTOR</td>
                <td className="py-3">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border badge-success">Фаол</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-3 border border-border rounded-xl text-xs text-muted-foreground mt-4 bg-muted/10 text-center">
          * Барча кўрсатилган фойдаланувчилар — «Тест маълумотлари»
        </div>
      </div>
    </div>
  )
}
