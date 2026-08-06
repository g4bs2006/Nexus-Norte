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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      avaliacoes: {
        Row: {
          created_at: string
          data: string | null
          id: string
          materia_id: string
          nome: string
          nota: number | null
          peso: number
        }
        Insert: {
          created_at?: string
          data?: string | null
          id?: string
          materia_id: string
          nome: string
          nota?: number | null
          peso: number
        }
        Update: {
          created_at?: string
          data?: string | null
          id?: string
          materia_id?: string
          nome?: string
          nota?: number | null
          peso?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_exercicios: {
        Row: {
          created_at: string
          grupo_muscular: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          grupo_muscular?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          grupo_muscular?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
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
            foreignKeyName: "categorias_subcategoria_pai_id_fkey"
            columns: ["subcategoria_pai_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
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
      conclusoes_fluxograma: {
        Row: {
          created_at: string
          data: string
          fluxograma_id: string
          id: string
        }
        Insert: {
          created_at?: string
          data: string
          fluxograma_id: string
          id?: string
        }
        Update: {
          created_at?: string
          data?: string
          fluxograma_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conclusoes_fluxograma_fluxograma_id_fkey"
            columns: ["fluxograma_id"]
            isOneToOne: false
            referencedRelation: "fluxograma_semanal"
            referencedColumns: ["id"]
          },
        ]
      }
      config_calculo_media: {
        Row: {
          id: string
          materia_id: string
          nota_manual: number | null
          observacao: string | null
          tipo: string
        }
        Insert: {
          id?: string
          materia_id: string
          nota_manual?: number | null
          observacao?: string | null
          tipo: string
        }
        Update: {
          id?: string
          materia_id?: string
          nota_manual?: number | null
          observacao?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_calculo_media_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: true
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          created_at: string
          id: string
          materia_id: string
          nome: string
          storage_path: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          materia_id: string
          nome: string
          storage_path: string
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          materia_id?: string
          nome?: string
          storage_path?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      excecoes_fluxograma: {
        Row: {
          data: string
          fluxograma_id: string
          id: string
          nova_data: string | null
          novo_horario_fim: string | null
          novo_horario_inicio: string | null
          status: string
        }
        Insert: {
          data: string
          fluxograma_id: string
          id?: string
          nova_data?: string | null
          novo_horario_fim?: string | null
          novo_horario_inicio?: string | null
          status: string
        }
        Update: {
          data?: string
          fluxograma_id?: string
          id?: string
          nova_data?: string | null
          novo_horario_fim?: string | null
          novo_horario_inicio?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "excecoes_fluxograma_fluxograma_id_fkey"
            columns: ["fluxograma_id"]
            isOneToOne: false
            referencedRelation: "fluxograma_semanal"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_exercicio: {
        Row: {
          carga_real: number
          execucao_treino_id: string
          exercicio_id: string
          id: string
          reps_reais: number
          rpe: number | null
        }
        Insert: {
          carga_real: number
          execucao_treino_id: string
          exercicio_id: string
          id?: string
          reps_reais: number
          rpe?: number | null
        }
        Update: {
          carga_real?: number
          execucao_treino_id?: string
          exercicio_id?: string
          id?: string
          reps_reais?: number
          rpe?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_exercicio_execucao_treino_id_fkey"
            columns: ["execucao_treino_id"]
            isOneToOne: false
            referencedRelation: "execucoes_treino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_exercicio_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios_treino"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_pulados: {
        Row: {
          created_at: string
          execucao_treino_id: string
          exercicio_id: string
          id: string
        }
        Insert: {
          created_at?: string
          execucao_treino_id: string
          exercicio_id: string
          id?: string
        }
        Update: {
          created_at?: string
          execucao_treino_id?: string
          exercicio_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_pulados_execucao_treino_id_fkey"
            columns: ["execucao_treino_id"]
            isOneToOne: false
            referencedRelation: "execucoes_treino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_pulados_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios_treino"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_treino: {
        Row: {
          created_at: string
          data: string
          duracao_minutos: number | null
          finalizado_em: string | null
          hora_inicio: string | null
          id: string
          treino_id: string
        }
        Insert: {
          created_at?: string
          data: string
          duracao_minutos?: number | null
          finalizado_em?: string | null
          hora_inicio?: string | null
          id?: string
          treino_id: string
        }
        Update: {
          created_at?: string
          data?: string
          duracao_minutos?: number | null
          finalizado_em?: string | null
          hora_inicio?: string | null
          id?: string
          treino_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_treino_treino_id_fkey"
            columns: ["treino_id"]
            isOneToOne: false
            referencedRelation: "treinos"
            referencedColumns: ["id"]
          },
        ]
      }
      exercicios_treino: {
        Row: {
          carga_alvo: number | null
          created_at: string
          descanso_segundos: number | null
          exercicio_base_id: string
          id: string
          reps_alvo: number | null
          series: number
          treino_id: string
        }
        Insert: {
          carga_alvo?: number | null
          created_at?: string
          descanso_segundos?: number | null
          exercicio_base_id: string
          id?: string
          reps_alvo?: number | null
          series?: number
          treino_id: string
        }
        Update: {
          carga_alvo?: number | null
          created_at?: string
          descanso_segundos?: number | null
          exercicio_base_id?: string
          id?: string
          reps_alvo?: number | null
          series?: number
          treino_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercicios_treino_exercicio_base_id_fkey"
            columns: ["exercicio_base_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_exercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercicios_treino_treino_id_fkey"
            columns: ["treino_id"]
            isOneToOne: false
            referencedRelation: "treinos"
            referencedColumns: ["id"]
          },
        ]
      }
      faltas: {
        Row: {
          data: string
          id: string
          materia_id: string
          motivo: string | null
        }
        Insert: {
          data: string
          id?: string
          materia_id: string
          motivo?: string | null
        }
        Update: {
          data?: string
          id?: string
          materia_id?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faltas_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      fluxograma_semanal: {
        Row: {
          dia_semana: number
          horario_fim: string
          horario_inicio: string
          id: string
          materia_id: string | null
          treino_id: string | null
        }
        Insert: {
          dia_semana: number
          horario_fim: string
          horario_inicio: string
          id?: string
          materia_id?: string | null
          treino_id?: string | null
        }
        Update: {
          dia_semana?: number
          horario_fim?: string
          horario_inicio?: string
          id?: string
          materia_id?: string | null
          treino_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fluxograma_semanal_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fluxograma_semanal_treino_id_fkey"
            columns: ["treino_id"]
            isOneToOne: false
            referencedRelation: "treinos"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "lancamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      log_progresso: {
        Row: {
          conteudo: string
          created_at: string
          data: string
          id: string
          projeto_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          data?: string
          id?: string
          projeto_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          data?: string
          id?: string
          projeto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_progresso_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      marcos_projeto: {
        Row: {
          created_at: string
          data_prevista: string | null
          id: string
          nome: string
          projeto_id: string
          status: string
        }
        Insert: {
          created_at?: string
          data_prevista?: string | null
          id?: string
          nome: string
          projeto_id: string
          status?: string
        }
        Update: {
          created_at?: string
          data_prevista?: string | null
          id?: string
          nome?: string
          projeto_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcos_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      materias: {
        Row: {
          carga_horaria_total: number | null
          created_at: string
          id: string
          limite_faltas: number
          media_atual: number | null
          nome: string
          professor: string | null
          semestre: string | null
        }
        Insert: {
          carga_horaria_total?: number | null
          created_at?: string
          id?: string
          limite_faltas?: number
          media_atual?: number | null
          nome: string
          professor?: string | null
          semestre?: string | null
        }
        Update: {
          carga_horaria_total?: number | null
          created_at?: string
          id?: string
          limite_faltas?: number
          media_atual?: number | null
          nome?: string
          professor?: string | null
          semestre?: string | null
        }
        Relationships: []
      }
      metas: {
        Row: {
          categoria_id: string | null
          concluida: boolean
          criada_em: string
          data_alvo: string | null
          descricao: string | null
          frequencia_alvo: number | null
          frequencia_periodo: string | null
          id: string
          materia_id: string | null
          projeto_id: string | null
          tipo: string
          tipo_treino_id: string | null
          titulo: string
          unidade: string | null
          valor_alvo: number | null
          valor_atual_manual: number | null
        }
        Insert: {
          categoria_id?: string | null
          concluida?: boolean
          criada_em?: string
          data_alvo?: string | null
          descricao?: string | null
          frequencia_alvo?: number | null
          frequencia_periodo?: string | null
          id?: string
          materia_id?: string | null
          projeto_id?: string | null
          tipo: string
          tipo_treino_id?: string | null
          titulo: string
          unidade?: string | null
          valor_alvo?: number | null
          valor_atual_manual?: number | null
        }
        Update: {
          categoria_id?: string | null
          concluida?: boolean
          criada_em?: string
          data_alvo?: string | null
          descricao?: string | null
          frequencia_alvo?: number | null
          frequencia_periodo?: string | null
          id?: string
          materia_id?: string | null
          projeto_id?: string | null
          tipo?: string
          tipo_treino_id?: string | null
          titulo?: string
          unidade?: string | null
          valor_alvo?: number | null
          valor_atual_manual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_tipo_treino_id_fkey"
            columns: ["tipo_treino_id"]
            isOneToOne: false
            referencedRelation: "tipos_treino"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_checkins: {
        Row: {
          data: string
          feito: boolean
          id: string
          meta_id: string
        }
        Insert: {
          data: string
          feito?: boolean
          id?: string
          meta_id: string
        }
        Update: {
          data?: string
          feito?: boolean
          id?: string
          meta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_checkins_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          carga: number
          created_at: string
          data: string
          exercicio_base_id: string
          id: string
          reps: number
          um_rm_estimado: number
        }
        Insert: {
          carga: number
          created_at?: string
          data: string
          exercicio_base_id: string
          id?: string
          reps: number
          um_rm_estimado: number
        }
        Update: {
          carga?: number
          created_at?: string
          data?: string
          exercicio_base_id?: string
          id?: string
          reps?: number
          um_rm_estimado?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercicio_base_id_fkey"
            columns: ["exercicio_base_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_exercicios"
            referencedColumns: ["id"]
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
            foreignKeyName: "planejamento_semanal_financeiro_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
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
      projetos: {
        Row: {
          created_at: string
          data_inicio: string
          descricao: string | null
          id: string
          nome: string
          prazo_alvo: string | null
          status: string
        }
        Insert: {
          created_at?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          nome: string
          prazo_alvo?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          nome?: string
          prazo_alvo?: string | null
          status?: string
        }
        Relationships: []
      }
      registro_corporal: {
        Row: {
          created_at: string
          data: string
          foto_storage_path: string | null
          id: string
          medidas: Json | null
          peso: number | null
        }
        Insert: {
          created_at?: string
          data: string
          foto_storage_path?: string | null
          id?: string
          medidas?: Json | null
          peso?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          foto_storage_path?: string | null
          id?: string
          medidas?: Json | null
          peso?: number | null
        }
        Relationships: []
      }
      registro_lesoes: {
        Row: {
          created_at: string
          data: string
          id: string
          intensidade: number
          observacao: string | null
          regiao: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          intensidade: number
          observacao?: string | null
          regiao: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          intensidade?: number
          observacao?: string | null
          regiao?: string
        }
        Relationships: []
      }
      registro_listas: {
        Row: {
          created_at: string
          data: string
          id: string
          materia_id: string
          nome_lista: string
          questoes_erradas: number[]
          topico: string | null
          total_questoes: number
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          materia_id: string
          nome_lista: string
          questoes_erradas?: number[]
          topico?: string | null
          total_questoes: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          materia_id?: string
          nome_lista?: string
          questoes_erradas?: number[]
          topico?: string | null
          total_questoes?: number
        }
        Relationships: [
          {
            foreignKeyName: "registro_listas_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
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
      sessoes_estudo: {
        Row: {
          created_at: string
          data: string
          duracao_minutos: number
          id: string
          materia_id: string
          meta_diaria_minutos: number | null
        }
        Insert: {
          created_at?: string
          data: string
          duracao_minutos: number
          id?: string
          materia_id: string
          meta_diaria_minutos?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          duracao_minutos?: number
          id?: string
          materia_id?: string
          meta_diaria_minutos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_estudo_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_treino: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      treinos: {
        Row: {
          created_at: string
          id: string
          nome: string
          tipo_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tipo_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tipo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treinos_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_treino"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "lancamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calcular_media_materia: {
        Args: { p_materia_id: string }
        Returns: number
      }
      candidatos_corte: {
        Args: never
        Returns: {
          categoria_id: string
          meses_estourados: number
          meta_efetiva: number
          nome: string
        }[]
      }
      progresso_meta: { Args: { p_meta_id: string }; Returns: number }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
