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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asignaciones: {
        Row: {
          asignado_a: string | null
          asignado_por: string | null
          cliente_id: string | null
          contrato_id: string | null
          created_at: string
          descripcion: string | null
          fecha_inicio: string
          fecha_vencimiento: string | null
          horas_estimadas: number | null
          horas_trabajadas: number | null
          id: string
          notas: string | null
          prioridad: Database["public"]["Enums"]["assignment_priority"]
          sede_id: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          asignado_a?: string | null
          asignado_por?: string | null
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_inicio?: string
          fecha_vencimiento?: string | null
          horas_estimadas?: number | null
          horas_trabajadas?: number | null
          id?: string
          notas?: string | null
          prioridad?: Database["public"]["Enums"]["assignment_priority"]
          sede_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          asignado_a?: string | null
          asignado_por?: string | null
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_inicio?: string
          fecha_vencimiento?: string | null
          horas_estimadas?: number | null
          horas_trabajadas?: number | null
          id?: string
          notas?: string | null
          prioridad?: Database["public"]["Enums"]["assignment_priority"]
          sede_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      calendario_trabajo: {
        Row: {
          asignacion_id: string | null
          cliente_id: string | null
          color: string | null
          completado: boolean
          created_at: string
          descripcion: string | null
          fecha: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          tipo: string
          titulo: string
          todo_el_dia: boolean
          updated_at: string
          usuario_id: string
        }
        Insert: {
          asignacion_id?: string | null
          cliente_id?: string | null
          color?: string | null
          completado?: boolean
          created_at?: string
          descripcion?: string | null
          fecha: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          tipo?: string
          titulo: string
          todo_el_dia?: boolean
          updated_at?: string
          usuario_id: string
        }
        Update: {
          asignacion_id?: string | null
          cliente_id?: string | null
          color?: string | null
          completado?: boolean
          created_at?: string
          descripcion?: string | null
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          tipo?: string
          titulo?: string
          todo_el_dia?: boolean
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendario_trabajo_asignacion_id_fkey"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "asignaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendario_trabajo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cartera_clientes: {
        Row: {
          cartera_id: string
          cliente_id: string
          created_at: string
          id: string
        }
        Insert: {
          cartera_id: string
          cliente_id: string
          created_at?: string
          id?: string
        }
        Update: {
          cartera_id?: string
          cliente_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartera_clientes_cartera_id_fkey"
            columns: ["cartera_id"]
            isOneToOne: false
            referencedRelation: "carteras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartera_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cartera_miembros: {
        Row: {
          cartera_id: string
          created_at: string
          id: string
          rol_en_cartera: string
          user_id: string
        }
        Insert: {
          cartera_id: string
          created_at?: string
          id?: string
          rol_en_cartera?: string
          user_id: string
        }
        Update: {
          cartera_id?: string
          created_at?: string
          id?: string
          rol_en_cartera?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartera_miembros_cartera_id_fkey"
            columns: ["cartera_id"]
            isOneToOne: false
            referencedRelation: "carteras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartera_miembros_profile_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      carteras: {
        Row: {
          activa: boolean
          created_at: string
          descripcion: string | null
          especialidad: string | null
          id: string
          nombre: string
          responsable_id: string | null
          sede_id: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          especialidad?: string | null
          id?: string
          nombre: string
          responsable_id?: string | null
          sede_id?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          especialidad?: string | null
          id?: string
          nombre?: string
          responsable_id?: string | null
          sede_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carteras_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          actividad_economica: string | null
          activo: boolean
          clave_sunat: string | null
          codigo: string
          contacto_email: string | null
          contacto_nombre: string | null
          contacto_nombre2: string | null
          contacto_telefono: string | null
          contacto_telefono2: string | null
          created_at: string
          created_by: string | null
          direccion: string | null
          email: string | null
          fecha_suspension: string | null
          id: string
          motivo_suspension_id: string | null
          nombre_persona_natural: string | null
          notas: string | null
          nro_trabajadores: number | null
          persona_natural_con_empresa: boolean | null
          razon_social: string
          regimen_laboral: string | null
          regimen_tributario: string | null
          sector: string | null
          sede_id: string | null
          telefono: string | null
          tipo_cliente: string
          updated_at: string
          usuario_sunat: string | null
        }
        Insert: {
          actividad_economica?: string | null
          activo?: boolean
          clave_sunat?: string | null
          codigo: string
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_nombre2?: string | null
          contacto_telefono?: string | null
          contacto_telefono2?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          fecha_suspension?: string | null
          id?: string
          motivo_suspension_id?: string | null
          nombre_persona_natural?: string | null
          notas?: string | null
          nro_trabajadores?: number | null
          persona_natural_con_empresa?: boolean | null
          razon_social: string
          regimen_laboral?: string | null
          regimen_tributario?: string | null
          sector?: string | null
          sede_id?: string | null
          telefono?: string | null
          tipo_cliente?: string
          updated_at?: string
          usuario_sunat?: string | null
        }
        Update: {
          actividad_economica?: string | null
          activo?: boolean
          clave_sunat?: string | null
          codigo?: string
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_nombre2?: string | null
          contacto_telefono?: string | null
          contacto_telefono2?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          fecha_suspension?: string | null
          id?: string
          motivo_suspension_id?: string | null
          nombre_persona_natural?: string | null
          notas?: string | null
          nro_trabajadores?: number | null
          persona_natural_con_empresa?: boolean | null
          razon_social?: string
          regimen_laboral?: string | null
          regimen_tributario?: string | null
          sector?: string | null
          sede_id?: string | null
          telefono?: string | null
          tipo_cliente?: string
          updated_at?: string
          usuario_sunat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_motivo_suspension_id_fkey"
            columns: ["motivo_suspension_id"]
            isOneToOne: false
            referencedRelation: "motivos_suspension"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion: {
        Row: {
          clave: string
          created_at: string
          descripcion: string | null
          id: string
          updated_at: string
          valor: Json
        }
        Insert: {
          clave: string
          created_at?: string
          descripcion?: string | null
          id?: string
          updated_at?: string
          valor?: Json
        }
        Update: {
          clave?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      contrato_plantilla_anexos: {
        Row: {
          created_at: string
          descripcion: string | null
          es_obligatorio: boolean | null
          id: string
          nombre: string
          orden: number
          plantilla_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          es_obligatorio?: boolean | null
          id?: string
          nombre: string
          orden?: number
          plantilla_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          es_obligatorio?: boolean | null
          id?: string
          nombre?: string
          orden?: number
          plantilla_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_plantilla_anexos_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "contrato_plantillas"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_plantilla_clausulas: {
        Row: {
          contenido: string
          created_at: string
          es_editable: boolean | null
          es_obligatoria: boolean | null
          id: string
          numero: number
          orden: number
          plantilla_id: string
          titulo: string
          updated_at: string
          variantes: Json | null
        }
        Insert: {
          contenido: string
          created_at?: string
          es_editable?: boolean | null
          es_obligatoria?: boolean | null
          id?: string
          numero: number
          orden?: number
          plantilla_id: string
          titulo: string
          updated_at?: string
          variantes?: Json | null
        }
        Update: {
          contenido?: string
          created_at?: string
          es_editable?: boolean | null
          es_obligatoria?: boolean | null
          id?: string
          numero?: number
          orden?: number
          plantilla_id?: string
          titulo?: string
          updated_at?: string
          variantes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_plantilla_clausulas_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "contrato_plantillas"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_plantilla_partes: {
        Row: {
          campos: Json
          created_at: string
          denominacion: string
          es_obligatoria: boolean | null
          id: string
          orden: number
          plantilla_id: string
          tipo_persona: string
        }
        Insert: {
          campos?: Json
          created_at?: string
          denominacion?: string
          es_obligatoria?: boolean | null
          id?: string
          orden?: number
          plantilla_id: string
          tipo_persona?: string
        }
        Update: {
          campos?: Json
          created_at?: string
          denominacion?: string
          es_obligatoria?: boolean | null
          id?: string
          orden?: number
          plantilla_id?: string
          tipo_persona?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_plantilla_partes_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "contrato_plantillas"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_plantillas: {
        Row: {
          activa: boolean | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          id: string
          jurisdiccion: string | null
          lenguaje_formal: boolean | null
          nombre: string
          tipo: string
          updated_at: string
        }
        Insert: {
          activa?: boolean | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          jurisdiccion?: string | null
          lenguaje_formal?: boolean | null
          nombre: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          activa?: boolean | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          jurisdiccion?: string | null
          lenguaje_formal?: boolean | null
          nombre?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      contrato_secuencias: {
        Row: {
          anio_vigente: number
          created_at: string
          digitos_correlativo: number
          id: string
          prefijo: string
          tipo: string
          ultimo_numero: number
          updated_at: string
        }
        Insert: {
          anio_vigente?: number
          created_at?: string
          digitos_correlativo?: number
          id?: string
          prefijo?: string
          tipo?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Update: {
          anio_vigente?: number
          created_at?: string
          digitos_correlativo?: number
          id?: string
          prefijo?: string
          tipo?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Relationships: []
      }
      contratos: {
        Row: {
          cliente_id: string
          condicion: Database["public"]["Enums"]["contract_condition"]
          created_at: string
          created_by: string | null
          datos_plantilla: Json | null
          descripcion: string
          dia_vencimiento: number | null
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          moneda: string
          monto_mensual: number | null
          monto_total: number | null
          notas: string | null
          numero: string
          numero_cuotas: number | null
          plantilla_id: string | null
          proforma_id: string | null
          responsable_id: string | null
          sede_id: string | null
          status: Database["public"]["Enums"]["contract_status"]
          tipo_servicio: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          condicion?: Database["public"]["Enums"]["contract_condition"]
          created_at?: string
          created_by?: string | null
          datos_plantilla?: Json | null
          descripcion: string
          dia_vencimiento?: number | null
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          moneda?: string
          monto_mensual?: number | null
          monto_total?: number | null
          notas?: string | null
          numero: string
          numero_cuotas?: number | null
          plantilla_id?: string | null
          proforma_id?: string | null
          responsable_id?: string | null
          sede_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tipo_servicio: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          condicion?: Database["public"]["Enums"]["contract_condition"]
          created_at?: string
          created_by?: string | null
          datos_plantilla?: Json | null
          descripcion?: string
          dia_vencimiento?: number | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          moneda?: string
          monto_mensual?: number | null
          monto_total?: number | null
          notas?: string | null
          numero?: string
          numero_cuotas?: number | null
          plantilla_id?: string | null
          proforma_id?: string | null
          responsable_id?: string | null
          sede_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tipo_servicio?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "contrato_plantillas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_proforma_id_fkey"
            columns: ["proforma_id"]
            isOneToOne: false
            referencedRelation: "proformas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_pago: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      metodos_pago: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      motivos_suspension: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      pagos: {
        Row: {
          banco: string | null
          contrato_id: string
          created_at: string
          created_by: string | null
          cuenta_bancaria: string | null
          detraccion_monto: number | null
          detraccion_porcentaje: number | null
          fecha_emision: string | null
          fecha_pago: string | null
          fecha_vencimiento: string
          id: string
          igv: number | null
          metodo_pago: string | null
          monto: number
          monto_neto: number | null
          notas: string | null
          numero_comprobante: string | null
          observaciones_contables: string | null
          proforma_id: string | null
          referencia: string | null
          retencion_monto: number | null
          retencion_porcentaje: number | null
          sede_id: string | null
          serie_comprobante: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subtotal: number | null
          tipo_comprobante: string | null
          tipo_igv: string | null
          updated_at: string
        }
        Insert: {
          banco?: string | null
          contrato_id: string
          created_at?: string
          created_by?: string | null
          cuenta_bancaria?: string | null
          detraccion_monto?: number | null
          detraccion_porcentaje?: number | null
          fecha_emision?: string | null
          fecha_pago?: string | null
          fecha_vencimiento: string
          id?: string
          igv?: number | null
          metodo_pago?: string | null
          monto: number
          monto_neto?: number | null
          notas?: string | null
          numero_comprobante?: string | null
          observaciones_contables?: string | null
          proforma_id?: string | null
          referencia?: string | null
          retencion_monto?: number | null
          retencion_porcentaje?: number | null
          sede_id?: string | null
          serie_comprobante?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number | null
          tipo_comprobante?: string | null
          tipo_igv?: string | null
          updated_at?: string
        }
        Update: {
          banco?: string | null
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          cuenta_bancaria?: string | null
          detraccion_monto?: number | null
          detraccion_porcentaje?: number | null
          fecha_emision?: string | null
          fecha_pago?: string | null
          fecha_vencimiento?: string
          id?: string
          igv?: number | null
          metodo_pago?: string | null
          monto?: number
          monto_neto?: number | null
          notas?: string | null
          numero_comprobante?: string | null
          observaciones_contables?: string | null
          proforma_id?: string | null
          referencia?: string | null
          retencion_monto?: number | null
          retencion_porcentaje?: number | null
          sede_id?: string | null
          serie_comprobante?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number | null
          tipo_comprobante?: string | null
          tipo_igv?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proforma_id_fkey"
            columns: ["proforma_id"]
            isOneToOne: false
            referencedRelation: "proformas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          asignar_supervision: boolean
          avatar_url: string | null
          created_at: string
          dni: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          puesto: string | null
          sede_id: string | null
          updated_at: string
        }
        Insert: {
          asignar_supervision?: boolean
          avatar_url?: string | null
          created_at?: string
          dni?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          puesto?: string | null
          sede_id?: string | null
          updated_at?: string
        }
        Update: {
          asignar_supervision?: boolean
          avatar_url?: string | null
          created_at?: string
          dni?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          puesto?: string | null
          sede_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      proforma_estados: {
        Row: {
          activo: boolean
          color: string
          created_at: string
          es_sistema: boolean
          id: string
          nombre: string
          nombre_display: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          color?: string
          created_at?: string
          es_sistema?: boolean
          id?: string
          nombre: string
          nombre_display: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          color?: string
          created_at?: string
          es_sistema?: boolean
          id?: string
          nombre?: string
          nombre_display?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      proforma_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string
          id: string
          precio_unitario: number
          proforma_id: string
          subtotal: number
        }
        Insert: {
          cantidad?: number
          created_at?: string
          descripcion: string
          id?: string
          precio_unitario: number
          proforma_id: string
          subtotal: number
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          precio_unitario?: number
          proforma_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "proforma_items_proforma_id_fkey"
            columns: ["proforma_id"]
            isOneToOne: false
            referencedRelation: "proformas"
            referencedColumns: ["id"]
          },
        ]
      }
      proforma_plantillas: {
        Row: {
          activa: boolean
          campos: Json
          created_at: string
          created_by: string | null
          descripcion: string | null
          estilos_pdf: Json | null
          id: string
          nombre: string
          servicios: Json
          tipo: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          campos?: Json
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estilos_pdf?: Json | null
          id?: string
          nombre: string
          servicios?: Json
          tipo?: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          campos?: Json
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estilos_pdf?: Json | null
          id?: string
          nombre?: string
          servicios?: Json
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      proforma_secuencias: {
        Row: {
          anio_vigente: number
          created_at: string
          digitos_correlativo: number
          id: string
          prefijo: string
          tipo: string
          ultimo_numero: number
          updated_at: string
        }
        Insert: {
          anio_vigente?: number
          created_at?: string
          digitos_correlativo?: number
          id?: string
          prefijo: string
          tipo: string
          ultimo_numero?: number
          updated_at?: string
        }
        Update: {
          anio_vigente?: number
          created_at?: string
          digitos_correlativo?: number
          id?: string
          prefijo?: string
          tipo?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Relationships: []
      }
      proformas: {
        Row: {
          campos_personalizados: Json | null
          cliente_id: string
          contrato_id: string | null
          created_at: string
          created_by: string | null
          fecha_emision: string
          fecha_vencimiento: string
          id: string
          igv: number
          incluir_proyeccion_pdf: boolean
          moneda: string
          notas: string | null
          numero: string
          sede_id: string | null
          status: Database["public"]["Enums"]["proforma_status"]
          subtotal: number
          tipo: string
          total: number
          updated_at: string
        }
        Insert: {
          campos_personalizados?: Json | null
          cliente_id: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          fecha_emision?: string
          fecha_vencimiento: string
          id?: string
          igv?: number
          incluir_proyeccion_pdf?: boolean
          moneda?: string
          notas?: string | null
          numero: string
          sede_id?: string | null
          status?: Database["public"]["Enums"]["proforma_status"]
          subtotal?: number
          tipo?: string
          total?: number
          updated_at?: string
        }
        Update: {
          campos_personalizados?: Json | null
          cliente_id?: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          fecha_emision?: string
          fecha_vencimiento?: string
          id?: string
          igv?: number
          incluir_proyeccion_pdf?: boolean
          moneda?: string
          notas?: string | null
          numero?: string
          sede_id?: string | null
          status?: Database["public"]["Enums"]["proforma_status"]
          subtotal?: number
          tipo?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proformas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proformas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proformas_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_ventas: {
        Row: {
          base_imponible: number
          centro_costo: string | null
          cliente_razon_social: string
          cliente_ruc: string
          created_at: string
          created_by: string | null
          cta_igv: string | null
          cta_ingreso: string | null
          cta_otros_tributos: string | null
          cta_por_cobrar: string | null
          estado: string
          fecha_emision: string
          glosa: string | null
          id: string
          igv: number
          moneda: string
          numero_comprobante: string | null
          pago_id: string | null
          periodo_anio: number
          periodo_mes: number
          serie_comprobante: string | null
          tipo_comprobante: string
          total: number
          updated_at: string
        }
        Insert: {
          base_imponible?: number
          centro_costo?: string | null
          cliente_razon_social: string
          cliente_ruc: string
          created_at?: string
          created_by?: string | null
          cta_igv?: string | null
          cta_ingreso?: string | null
          cta_otros_tributos?: string | null
          cta_por_cobrar?: string | null
          estado?: string
          fecha_emision: string
          glosa?: string | null
          id?: string
          igv?: number
          moneda?: string
          numero_comprobante?: string | null
          pago_id?: string | null
          periodo_anio: number
          periodo_mes: number
          serie_comprobante?: string | null
          tipo_comprobante?: string
          total?: number
          updated_at?: string
        }
        Update: {
          base_imponible?: number
          centro_costo?: string | null
          cliente_razon_social?: string
          cliente_ruc?: string
          created_at?: string
          created_by?: string | null
          cta_igv?: string | null
          cta_ingreso?: string | null
          cta_otros_tributos?: string | null
          cta_por_cobrar?: string | null
          estado?: string
          fecha_emision?: string
          glosa?: string | null
          id?: string
          igv?: number
          moneda?: string
          numero_comprobante?: string | null
          pago_id?: string | null
          periodo_anio?: number
          periodo_mes?: number
          serie_comprobante?: string | null
          tipo_comprobante?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registro_ventas_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permisos: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre_display: string
          permisos: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre_display: string
          permisos?: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre_display?: string
          permisos?: Json
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      sedes: {
        Row: {
          activa: boolean
          codigo: string
          created_at: string
          direccion: string | null
          id: string
          nombre: string
          orden: number
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          codigo: string
          created_at?: string
          direccion?: string | null
          id?: string
          nombre: string
          orden?: number
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          codigo?: string
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
          orden?: number
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      servicios: {
        Row: {
          activo: boolean
          base_imponible: number | null
          compras_ventas_anual_soles: string | null
          compras_ventas_mensual_soles: string | null
          created_at: string
          entidad: string | null
          grupo_servicio: string | null
          id: string
          igv_monto: number | null
          precio_servicio: number | null
          regimen_tributario: string | null
          servicio: string
          tipo_servicio: string
          tramite: string | null
          updated_at: string
          valoracion: string | null
        }
        Insert: {
          activo?: boolean
          base_imponible?: number | null
          compras_ventas_anual_soles?: string | null
          compras_ventas_mensual_soles?: string | null
          created_at?: string
          entidad?: string | null
          grupo_servicio?: string | null
          id?: string
          igv_monto?: number | null
          precio_servicio?: number | null
          regimen_tributario?: string | null
          servicio: string
          tipo_servicio: string
          tramite?: string | null
          updated_at?: string
          valoracion?: string | null
        }
        Update: {
          activo?: boolean
          base_imponible?: number | null
          compras_ventas_anual_soles?: string | null
          compras_ventas_mensual_soles?: string | null
          created_at?: string
          entidad?: string | null
          grupo_servicio?: string | null
          id?: string
          igv_monto?: number | null
          precio_servicio?: number | null
          regimen_tributario?: string | null
          servicio?: string
          tipo_servicio?: string
          tramite?: string | null
          updated_at?: string
          valoracion?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sedes: {
        Row: {
          created_at: string
          id: string
          sede_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sede_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sede_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sedes_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sedes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          updated_at: string
          uploaded_by: string | null
          workflow_id: string
          workflow_item_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          updated_at?: string
          uploaded_by?: string | null
          workflow_id: string
          workflow_item_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          updated_at?: string
          uploaded_by?: string | null
          workflow_id?: string
          workflow_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_attachments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_checklists: {
        Row: {
          created_at: string
          estado: string | null
          fecha_verificacion: string | null
          id: string
          items: Json | null
          porcentaje_completado: number | null
          titulo: string
          updated_at: string
          verificado_por: string | null
          workflow_id: string
          workflow_item_id: string
        }
        Insert: {
          created_at?: string
          estado?: string | null
          fecha_verificacion?: string | null
          id?: string
          items?: Json | null
          porcentaje_completado?: number | null
          titulo: string
          updated_at?: string
          verificado_por?: string | null
          workflow_id: string
          workflow_item_id: string
        }
        Update: {
          created_at?: string
          estado?: string | null
          fecha_verificacion?: string | null
          id?: string
          items?: Json | null
          porcentaje_completado?: number | null
          titulo?: string
          updated_at?: string
          verificado_por?: string | null
          workflow_id?: string
          workflow_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_checklists_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_kanban_cards: {
        Row: {
          asignado_a: string | null
          asignados: Json | null
          color_tarjeta: string | null
          created_at: string
          descripcion: string | null
          etiquetas: Json | null
          fecha_vencimiento: string | null
          id: string
          orden: number
          prioridad: string | null
          status: string
          titulo: string
          updated_at: string
          workflow_id: string
          workflow_item_id: string
        }
        Insert: {
          asignado_a?: string | null
          asignados?: Json | null
          color_tarjeta?: string | null
          created_at?: string
          descripcion?: string | null
          etiquetas?: Json | null
          fecha_vencimiento?: string | null
          id?: string
          orden?: number
          prioridad?: string | null
          status?: string
          titulo: string
          updated_at?: string
          workflow_id: string
          workflow_item_id: string
        }
        Update: {
          asignado_a?: string | null
          asignados?: Json | null
          color_tarjeta?: string | null
          created_at?: string
          descripcion?: string | null
          etiquetas?: Json | null
          fecha_vencimiento?: string | null
          id?: string
          orden?: number
          prioridad?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          workflow_id?: string
          workflow_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_kanban_cards_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_kanban_config: {
        Row: {
          columnas: Json
          created_at: string
          id: string
          updated_at: string
          workflow_id: string
          workflow_item_id: string
        }
        Insert: {
          columnas?: Json
          created_at?: string
          id?: string
          updated_at?: string
          workflow_id: string
          workflow_item_id: string
        }
        Update: {
          columnas?: Json
          created_at?: string
          id?: string
          updated_at?: string
          workflow_id?: string
          workflow_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_kanban_config_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_notes: {
        Row: {
          content: Json | null
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          orden: number
          tipo: string
          titulo: string | null
          updated_at: string
          workflow_id: string
          workflow_item_id: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          orden?: number
          tipo?: string
          titulo?: string | null
          updated_at?: string
          workflow_id: string
          workflow_item_id: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          orden?: number
          tipo?: string
          titulo?: string | null
          updated_at?: string
          workflow_id?: string
          workflow_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_notes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_secuencias: {
        Row: {
          anio_vigente: number
          created_at: string
          digitos_correlativo: number
          id: string
          prefijo: string
          ultimo_numero: number
          updated_at: string
        }
        Insert: {
          anio_vigente?: number
          created_at?: string
          digitos_correlativo?: number
          id?: string
          prefijo?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Update: {
          anio_vigente?: number
          created_at?: string
          digitos_correlativo?: number
          id?: string
          prefijo?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          codigo: string
          contrato_id: string | null
          created_at: string
          created_by: string | null
          fecha_creacion: string
          id: string
          items: Json
          nombre_plantilla: string | null
          sede_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          codigo: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          fecha_creacion?: string
          id?: string
          items?: Json
          nombre_plantilla?: string | null
          sede_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          fecha_creacion?: string
          id?: string
          items?: Json
          nombre_plantilla?: string | null
          sede_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_all_sedes: { Args: { _user_id: string }; Returns: boolean }
      get_next_proforma_number: { Args: { p_tipo: string }; Returns: string }
      get_next_workflow_code: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_sede: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_sede: {
        Args: { _sede_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "administrador"
        | "gerente"
        | "asesor"
        | "auxiliar"
        | "practicante"
        | "supervisor"
        | "contador"
        | "asistente"
      assignment_priority: "baja" | "media" | "alta" | "urgente"
      assignment_status:
        | "pendiente"
        | "en_progreso"
        | "completada"
        | "cancelada"
      contract_condition: "Vigente" | "Terminado" | "Anulado" | "Suspendido"
      contract_status:
        | "borrador"
        | "en_gestion"
        | "aprobado"
        | "anulado"
        | "activo"
        | "pausado"
        | "finalizado"
        | "cancelado"
      payment_status: "pendiente" | "pagado" | "vencido" | "parcial"
      proforma_status:
        | "borrador"
        | "enviada"
        | "aprobada"
        | "rechazada"
        | "facturada"
      proforma_tipo: "contabilidad" | "tramites"
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
    Enums: {
      app_role: [
        "administrador",
        "gerente",
        "asesor",
        "auxiliar",
        "practicante",
        "supervisor",
        "contador",
        "asistente",
      ],
      assignment_priority: ["baja", "media", "alta", "urgente"],
      assignment_status: [
        "pendiente",
        "en_progreso",
        "completada",
        "cancelada",
      ],
      contract_condition: ["Vigente", "Terminado", "Anulado", "Suspendido"],
      contract_status: [
        "borrador",
        "en_gestion",
        "aprobado",
        "anulado",
        "activo",
        "pausado",
        "finalizado",
        "cancelado",
      ],
      payment_status: ["pendiente", "pagado", "vencido", "parcial"],
      proforma_status: [
        "borrador",
        "enviada",
        "aprobada",
        "rechazada",
        "facturada",
      ],
      proforma_tipo: ["contabilidad", "tramites"],
    },
  },
} as const
