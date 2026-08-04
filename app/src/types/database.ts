// Gerado automaticamente a partir do schema do Supabase.
// Regenerar com: npm run types:gen
// NÃO editar à mão. Tipos de domínio narrowed (uniões de literais para colunas
// text com CHECK) ficam em src/features/*/types.ts.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15'
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          cor: string | null
          created_at: string
          id: string
          meta_mensal: number | null
          meta_tipo: string | null
          natureza: string
          nome: string
          subcategoria_pai_id: string | null
          tipo: string | null
          total_gasto_mes: number
        }
        Insert: {
          cor?: string | null
          created_at?: string
          id?: string
          meta_mensal?: number | null
          meta_tipo?: string | null
          natureza: string
          nome: string
          subcategoria_pai_id?: string | null
          tipo?: string | null
          total_gasto_mes?: number
        }
        Update: {
          cor?: string | null
          created_at?: string
          id?: string
          meta_mensal?: number | null
          meta_tipo?: string | null
          natureza?: string
          nome?: string
          subcategoria_pai_id?: string | null
          tipo?: string | null
          total_gasto_mes?: number
        }
        Relationships: [
          {
            foreignKeyName: 'categorias_subcategoria_pai_id_fkey'
            columns: ['subcategoria_pai_id']
            isOneToOne: false
            referencedRelation: 'categorias'
            referencedColumns: ['id']
          },
        ]
      }
      checks_diarios: {
        Row: {
          created_at: string
          data: string
          financeiro_registrado: boolean
          id: string
          planejamento_semana_feito: boolean
        }
        Insert: {
          created_at?: string
          data: string
          financeiro_registrado?: boolean
          id?: string
          planejamento_semana_feito?: boolean
        }
        Update: {
          created_at?: string
          data?: string
          financeiro_registrado?: boolean
          id?: string
          planejamento_semana_feito?: boolean
        }
        Relationships: []
      }
      investimentos: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          tipo: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          categoria_id: string
          created_at: string
          data: string
          data_vencimento: string | null
          descricao: string | null
          forma_pagamento: string | null
          id: string
          valor: number
        }
        Insert: {
          categoria_id: string
          created_at?: string
          data: string
          data_vencimento?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          valor: number
        }
        Update: {
          categoria_id?: string
          created_at?: string
          data?: string
          data_vencimento?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: 'lancamentos_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias'
            referencedColumns: ['id']
          },
        ]
      }
      planejamento_semanal_financeiro: {
        Row: {
          categoria_id: string
          dia_semana: number
          id: string
          semana_inicio: string
          valor_planejado: number
        }
        Insert: {
          categoria_id: string
          dia_semana: number
          id?: string
          semana_inicio: string
          valor_planejado: number
        }
        Update: {
          categoria_id?: string
          dia_semana?: number
          id?: string
          semana_inicio?: string
          valor_planejado?: number
        }
        Relationships: [
          {
            foreignKeyName: 'planejamento_semanal_financeiro_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias'
            referencedColumns: ['id']
          },
        ]
      }
      planejamento_sono: {
        Row: {
          dia_semana: number
          hora_acordar_alvo: string
          hora_dormir_alvo: string
          id: string
        }
        Insert: {
          dia_semana: number
          hora_acordar_alvo: string
          hora_dormir_alvo: string
          id?: string
        }
        Update: {
          dia_semana?: number
          hora_acordar_alvo?: string
          hora_dormir_alvo?: string
          id?: string
        }
        Relationships: []
      }
      registro_sono: {
        Row: {
          data: string
          hora_acordar_real: string
          hora_dormir_real: string
          horas_calculadas: number | null
          id: string
        }
        Insert: {
          data: string
          hora_acordar_real: string
          hora_dormir_real: string
          horas_calculadas?: number | null
          id?: string
        }
        Update: {
          data?: string
          hora_acordar_real?: string
          hora_dormir_real?: string
          horas_calculadas?: number | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      receita_mensal: {
        Row: {
          mes: string | null
          total: number | null
        }
        Relationships: []
      }
      resumo_mensal_categoria: {
        Row: {
          categoria_id: string | null
          mes: string | null
          qtd_lancamentos: number | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'lancamentos_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      candidatos_corte: {
        Args: never
        Returns: {
          categoria_id: string
          meses_estourados: number
          meta_efetiva: number
          nome: string
        }[]
      }
      recalcular_total_gasto_mes: {
        Args: { p_categoria_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
