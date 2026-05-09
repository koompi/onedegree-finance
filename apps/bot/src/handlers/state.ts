export const userStates = new Map<number, 'income' | 'expense'>()

export interface ActiveCompanyState {
  companyId: string
  accountId: string
}
export const userActiveCompany = new Map<number, ActiveCompanyState>()