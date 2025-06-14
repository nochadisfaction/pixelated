---
applyTo: '**'
---
# Optimized Supabase PostgreSQL Function Development Guide

## Core Principles

- **Security-First**: Use `SECURITY INVOKER` by default with explicit `search_path`
- **Performance-Oriented**: Design functions with execution efficiency in mind
- **Type Safety**: Leverage PostgreSQL's strong typing system
- **Maintainability**: Write clear, documented, and testable functions
- **Access Control**: Integrate properly with Row Level Security (RLS)

## Security Best Practices

1. **Default to `SECURITY INVOKER`**
   - Functions run with the caller's permissions
   - Use `SECURITY DEFINER` only when absolutely necessary
   - When using `SECURITY DEFINER`, always add a comment explaining why

2. **Explicitly Set `search_path`**
   ```sql
   set search_path = '';
   ```
   - Prevents schema injection attacks
   - Always use fully qualified names (`schema.table`)

3. **Row Level Security Integration**
   - Design functions to work seamlessly with RLS policies
   - Test functions with different user roles
   - Document RLS implications for each function

## Performance Optimization

1. **Function Volatility**
   - Use `IMMUTABLE` for functions with identical outputs for identical inputs
   - Use `STABLE` for functions that don't modify database but may return different results
   - Reserve `VOLATILE` (default) for functions that modify database state

2. **Query Efficiency**
   - Use `EXPLAIN ANALYZE` to verify function query plans
   - Consider indexing strategies for tables accessed by functions
   - Use CTEs for complex queries to improve readability and optimization

3. **Batch Operations**
   - Prefer set-based operations over row-by-row processing
   - Use arrays and `unnest()` for bulk operations
   - Leverage `WITH ORDINALITY` for maintaining order in transformations

## Type System and Error Handling

1. **Custom Types and Domains**
   - Create domain types for common constraints
   - Use composite types for structured returns
   - Leverage enums for constrained option sets

2. **Robust Error Handling**
   ```sql
   BEGIN
     -- Function logic
   EXCEPTION
     WHEN unique_violation THEN
       RAISE EXCEPTION 'Duplicate entry: %', SQLERRM
         USING HINT = 'Check if the record already exists';
     WHEN OTHERS THEN
       RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
   END;
   ```

3. **Return Types**
   - Prefer composite types or tables for multi-value returns
   - Use `SETOF` for returning multiple rows
   - Document column names and types for `TABLE` return types

## Function Categories and Templates

### 1. Data Access Functions

```sql
CREATE OR REPLACE FUNCTION public.get_filtered_items(
  p_category text,
  p_min_price numeric DEFAULT 0,
  p_limit integer DEFAULT 100
)
RETURNS SETOF public.items
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
  SELECT * FROM public.items
  WHERE category = p_category
    AND price >= p_min_price
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;
```

### 2. JSON Processing Functions

```sql
CREATE OR REPLACE FUNCTION public.aggregate_metrics(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_orders', COUNT(*),
    'total_spent', SUM(amount),
    'items_purchased', jsonb_agg(jsonb_build_object('name', i.name, 'quantity', oi.quantity))
  ) INTO resul
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  JOIN public.items i ON i.id = oi.item_id
  WHERE o.user_id = p_user_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
```

### 3. Trigger Functions

```sql
CREATE OR REPLACE FUNCTION public.process_audit_trail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  audit_data jsonb;
BEGIN
  -- Skip if session context indicates system operation
  IF current_setting('app.system_operation', true) = 'true' THEN
    RETURN NEW;
  END IF;

  audit_data = jsonb_build_object(
    'table', TG_TABLE_NAME,
    'action', TG_OP,
    'timestamp', now(),
    'user_id', nullif(current_setting('auth.uid', true), ''),
    'old_data', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    'new_data', CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );

  INSERT INTO public.audit_logs(audit_data) VALUES (audit_data);
  RETURN NEW;
END;
$$;

CREATE TRIGGER items_audi
AFTER INSERT OR UPDATE OR DELETE ON public.items
FOR EACH ROW EXECUTE FUNCTION public.process_audit_trail();
```

### 4. Utility Functions with Error Handling

```sql
CREATE OR REPLACE FUNCTION public.safe_json_extract(
  p_json jsonb,
  p_path text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
IMMUTABLE
AS $$
BEGIN
  IF p_json IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN p_json #> p_path;
  EXCEPTION
    WHEN data_exception THEN
      RAISE WARNING 'Invalid JSON path: %', p_path;
      RETURN NULL;
  END;
END;
$$;
```

## Testing and Documentation

1. **Write Function Tests**
   ```sql
   DO $$
   BEGIN
     -- Test case setup
     INSERT INTO public.test_items(id, name, price) VALUES (1, 'Test', 10.00);

     -- Test function
     ASSERT (SELECT price FROM public.get_item_details(1)) = 10.00,
       'Function should return correct price';

     -- Cleanup
     DELETE FROM public.test_items WHERE id = 1;
   END $$;
   ```

2. **Document Using Comments**
   ```sql
   COMMENT ON FUNCTION public.get_filtered_items(text, numeric, integer) IS
   'Returns filtered items by category and minimum price.
   Parameters:
     p_category - Item category to filter by
     p_min_price - Minimum price filter (default: 0)
     p_limit - Maximum number of results (default: 100)

   Example: SELECT * FROM public.get_filtered_items(''electronics'', 25.99, 10);

   Note: Respects RLS policies.';
   ```

## Migration and Versioning

1. **Version Control Strategies**
   - Include function version in name or documentation
   - Maintain backward compatibility when possible
   - Use Supabase migrations for deploymen

2. **Deprecation Process**
   ```sql
   CREATE OR REPLACE FUNCTION public.get_user_details_v2(p_user_id uuid)
   RETURNS SETOF public.user_details_v2
   LANGUAGE sql
   SECURITY INVOKER
   SET search_path = ''
   STABLE
   AS $$
     -- New implementation
   $$;

   CREATE OR REPLACE FUNCTION public.get_user_details(p_user_id uuid)
   RETURNS SETOF public.user_details
   LANGUAGE sql
   SECURITY INVOKER
   SET search_path = ''
   STABLE
   AS $$
     -- Call new version with compatibility layer
     SELECT id, name, email, created_a
     FROM public.get_user_details_v2(p_user_id);
   $$;

   COMMENT ON FUNCTION public.get_user_details(uuid) IS 'DEPRECATED: Use get_user_details_v2 instead';
   ```

## Advanced Techniques

1. **Recursive Functions for Hierarchical Data**
   ```sql
   CREATE OR REPLACE FUNCTION public.get_category_tree(p_parent_id integer DEFAULT NULL)
   RETURNS TABLE(id integer, name text, parent_id integer, depth integer, path integer[])
   LANGUAGE sql
   SECURITY INVOKER
   SET search_path = ''
   STABLE
   AS $$
     WITH RECURSIVE category_tree AS (
       -- Base case
       SELECT c.id, c.name, c.parent_id, 0 as depth, ARRAY[c.id] as path
       FROM public.categories c
       WHERE c.parent_id IS NOT DISTINCT FROM p_parent_id

       UNION ALL

       -- Recursive case
       SELECT c.id, c.name, c.parent_id, ct.depth + 1, ct.path || c.id
       FROM public.categories c
       JOIN category_tree ct ON c.parent_id = ct.id
     )
     SELECT * FROM category_tree ORDER BY path;
   $$;
   ```

2. **Session Context Management**
   ```sql
   -- Set context at start of transaction
   CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id uuid)
   RETURNS void
   LANGUAGE plpgsql
   SECURITY DEFINER -- Allows changing session variables
   SET search_path = ''
   AS $$
   BEGIN
     PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
   END;
   $$;
   ```

## Performance Monitoring

```sql
CREATE OR REPLACE FUNCTION public.log_function_performance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  execution_time interval;
BEGIN
  -- Record function execution time
  execution_time := clock_timestamp() - statement_timestamp();

  -- Log slow functions (over 500ms)
  IF execution_time > interval '500 milliseconds' THEN
    INSERT INTO public.function_performance_logs(
      function_name,
      execution_time,
      parameters,
      query_plan
    ) VALUES (
      TG_ARGV[0],
      execution_time,
      current_query(),
      (SELECT query_plan FROM pg_stat_statements
       WHERE query = current_query()
       LIMIT 1)
    );
  END IF;

  RETURN NULL;
END;
$$;
```

## Real-time Subscriptions

### 1. Publication Setup for Real-time

```sql
-- Create publication for tables that should be available in real-time
CREATE PUBLICATION supabase_realtime FOR TABLE
  public.users,
  public.messages,
  public.chat_rooms;

-- Make publication available only for specific columns to protect sensitive data
ALTER PUBLICATION supabase_realtime SET
  TABLE public.users (id, username, avatar_url, last_seen, status),
  TABLE public.messages (id, room_id, sender_id, content, created_at),
  TABLE public.chat_rooms (id, name, description, created_at, updated_at);
```

### 2. Optimizing for Real-time Functionality

```sql
-- Function to broadcast only specific changes as real-time events
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update the chat room's updated_at timestamp
  UPDATE public.chat_rooms
  SET updated_at = now()
  WHERE id = NEW.room_id;

  -- Update unread message counts
  INSERT INTO public.user_unread_messages (user_id, room_id, count)
  SELECT
    m.user_id,
    NEW.room_id,
    1
  FROM public.chat_room_members m
  WHERE
    m.room_id = NEW.room_id
    AND m.user_id != NEW.sender_id
  ON CONFLICT (user_id, room_id)
  DO UPDATE SET
    count = user_unread_messages.count + 1,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER handle_new_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();
```

### 3. Broadcast Notifications for Custom Real-time Events

```sql
-- Function to broadcast custom payload over Supabase real-time
CREATE OR REPLACE FUNCTION public.broadcast_task_assigned(
  p_task_id uuid,
  p_assigned_to uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  task_payload jsonb;
BEGIN
  -- Build payload for the notification
  SELECT jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'due_date', t.due_date,
    'priority', t.priority,
    'assigned_by', nullif(current_setting('auth.uid', true), '')::uuid,
    'assigned_at', now()
  ) INTO task_payload
  FROM public.tasks
  WHERE t.id = p_task_id;

  -- Broadcast notification using pg_notify
  -- Channel format: 'realtime:{database}:{schema}:{table}'
  PERFORM pg_notify(
    'realtime:public:task_assignments',
    jsonb_build_object(
      'type', 'INSERT',
      'record', task_payload,
      'old_record', null,
      'schema', 'public',
      'table', 'task_assignments'
    )::tex
  );
END;
$$;
```

## Edge Functions Integration

### 1. Database Functions to Support Edge Functions

```sql
-- Create type for Edge Function response
CREATE TYPE public.edge_function_response AS (
  status integer,
  body jsonb
);

-- Function to prepare data for Edge Function
CREATE OR REPLACE FUNCTION public.prepare_edge_function_data(
  p_function_name text,
  p_input_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Validate input data based on function requirements
  CASE
    WHEN p_function_name = 'process-payment' THEN
      -- Validate payment data
      IF NOT (p_input_data ? 'amount' AND p_input_data ? 'currency') THEN
        RAISE EXCEPTION 'Missing required payment fields';
      END IF;

      -- Enrich with necessary database data
      SELECT jsonb_build_object(
        'payment_data', p_input_data,
        'customer', jsonb_build_object(
          'id', c.id,
          'email', c.email,
          'name', c.name,
          'payment_methods', pm.methods
        )
      ) INTO resul
      FROM public.customers c
      LEFT JOIN public.customer_payment_methods pm ON pm.customer_id = c.id
      WHERE c.id = (p_input_data->>'customer_id')::uuid;

    WHEN p_function_name = 'generate-report' THEN
      -- Different logic for report generation
      result := p_input_data;

    ELSE
      RAISE EXCEPTION 'Unknown edge function: %', p_function_name;
  END CASE;

  RETURN result;
END;
$$;

-- Function to record Edge Function invocation results
CREATE OR REPLACE FUNCTION public.log_edge_function_result(
  p_function_name text,
  p_input jsonb,
  p_output jsonb,
  p_status integer,
  p_execution_time interval
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.edge_function_logs(
    function_name,
    input_data,
    output_data,
    status_code,
    execution_time,
    invoked_by
  )
  VALUES (
    p_function_name,
    p_input,
    p_output,
    p_status,
    p_execution_time,
    nullif(current_setting('auth.uid', true), '')::uuid
  );
$$;
```

### 2. Verifying Edge Function Results

```sql
-- Function to validate and process edge function results
CREATE OR REPLACE FUNCTION public.process_edge_function_result(
  p_function_name text,
  p_result public.edge_function_response
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  processed_result jsonb;
BEGIN
  -- Verify function execution was successful
  IF p_result.status >= 400 THEN
    RAISE EXCEPTION 'Edge function % failed with status %: %',
      p_function_name,
      p_result.status,
      p_result.body->>'error';
  END IF;

  -- Process results based on function type
  CASE
    WHEN p_function_name = 'process-payment' THEN
      -- Record successful paymen
      INSERT INTO public.payments(
        amount,
        currency,
        payment_id,
        status,
        customer_id,
        metadata
      )
      VALUES (
        (p_result.body->>'amount')::numeric,
        p_result.body->>'currency',
        p_result.body->>'payment_id',
        p_result.body->>'status',
        (p_result.body->>'customer_id')::uuid,
        p_result.body->'metadata'
      )
      RETURNING to_jsonb(payments.*) INTO processed_result;

    WHEN p_function_name = 'generate-report' THEN
      -- Store report results
      processed_result := p_result.body;

    ELSE
      processed_result := p_result.body;
  END CASE;

  RETURN processed_result;
END;
$$;
```

## Row Level Security with Multiple Auth Providers

### 1. Universal RLS Policies

```sql
-- Table with multi-auth suppor
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  owner_id uuid REFERENCES auth.users(id),
  owner_type text NOT NULL DEFAULT 'supabase', -- 'supabase', 'github', 'google', etc.
  owner_external_id text, -- ID from external provider
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Universal policy that works across auth providers
CREATE POLICY "Users can view their own documents"
  ON public.documents
  FOR SELECT
  USING (
    (owner_id = auth.uid() AND owner_type = 'supabase')
    OR
    (owner_type = 'github' AND owner_external_id = (
      SELECT external_id FROM auth.identities
      WHERE provider = 'github' AND id = auth.uid()
    ))
    OR
    (owner_type = 'google' AND owner_external_id = (
      SELECT external_id FROM auth.identities
      WHERE provider = 'google' AND id = auth.uid()
    ))
  );
```

### 2. Helper Functions for RLS Policies

```sql
-- Function to check if current user matches any auth identity
CREATE OR REPLACE FUNCTION public.check_user_identity(
  p_provider text,
  p_external_id tex
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_uid uuid;
  v_match boolean;
BEGIN
  -- Get current user ID
  v_current_uid := auth.uid();

  -- No authenticated user
  IF v_current_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Check if this user has the specified identity
  SELECT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE id = v_current_uid
    AND provider = p_provider
    AND external_id = p_external_id
  ) INTO v_match;

  RETURN v_match;
END;
$$;

-- Function to get all external IDs for current user
CREATE OR REPLACE FUNCTION public.get_user_external_ids()
RETURNS TABLE(provider text, external_id text)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
  SELECT provider, external_id
  FROM auth.identities
  WHERE id = auth.uid();
$$;
```

### 3. Role-Based Access Control

```sql
-- Create role enum
CREATE TYPE public.user_role AS ENUM ('admin', 'editor', 'viewer');

-- Create user roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  role public.user_role NOT NULL,
  resource_id uuid, -- Optional, for resource-specific roles
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(
  p_role public.user_role,
  p_resource_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = p_role
    AND (p_resource_id IS NULL OR resource_id IS NULL OR resource_id = p_resource_id)
  );
$$;

-- Apply RBAC in RLS policy
CREATE POLICY "Admins can edit any document"
  ON public.documents
  FOR UPDATE
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

CREATE POLICY "Editors can edit their assigned documents"
  ON public.documents
  FOR UPDATE
  USING (
    public.has_role('editor', id) OR
    (owner_id = auth.uid() AND owner_type = 'supabase')
  )
  WITH CHECK (
    public.has_role('editor', id) OR
    (owner_id = auth.uid() AND owner_type = 'supabase')
  );
```

## Backup and Disaster Recovery

### 1. Automated Backup Functions

```sql
-- Function to create a backup of a specific table
CREATE OR REPLACE FUNCTION admin.backup_table(
  p_schema text,
  p_table text,
  p_backup_schema text DEFAULT 'backups'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_backup_table text;
  v_timestamp text;
BEGIN
  -- Generate timestamp for backup table name
  v_timestamp := to_char(current_timestamp, 'YYYYMMDD_HH24MI');
  v_backup_table := p_backup_schema || '.' || p_table || '_backup_' || v_timestamp;

  -- Create backup schema if it doesn't exis
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_backup_schema);

  -- Create backup table with data
  EXECUTE format(
    'CREATE TABLE %s AS SELECT * FROM %I.%I',
    v_backup_table,
    p_schema,
    p_table
  );

  -- Log the backup
  INSERT INTO admin.backup_logs(
    schema_name,
    table_name,
    backup_table_name,
    backup_type,
    rows_coun
  )
  SELECT
    p_schema,
    p_table,
    v_backup_table,
    'manual',
    (SELECT count(*) FROM p_schema || '.' || p_table);
END;
$$;

-- Function to restore from a backup
CREATE OR REPLACE FUNCTION admin.restore_from_backup(
  p_backup_table text,
  p_target_schema text,
  p_target_table text,
  p_delete_existing boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Validate backup table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema || '.' || table_name = p_backup_table
  ) THEN
    RAISE EXCEPTION 'Backup table % does not exist', p_backup_table;
  END IF;

  -- Handle existing data
  IF p_delete_existing THEN
    EXECUTE format('TRUNCATE TABLE %I.%I', p_target_schema, p_target_table);
  END IF;

  -- Copy data from backup to targe
  EXECUTE format(
    'INSERT INTO %I.%I SELECT * FROM %s',
    p_target_schema,
    p_target_table,
    p_backup_table
  );

  -- Log the restoration
  INSERT INTO admin.backup_logs(
    schema_name,
    table_name,
    backup_table_name,
    backup_type,
    rows_coun
  )
  SELECT
    p_target_schema,
    p_target_table,
    p_backup_table,
    'restore',
    (SELECT count(*) FROM p_target_schema || '.' || p_target_table);
END;
$$;
```

### 2. Point-in-Time Recovery Suppor

```sql
-- Create structure for tracking table changes for PITR
CREATE TABLE admin.change_history (
  id bigserial PRIMARY KEY,
  schema_name text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid
);

-- Function to track changes for PITR
CREATE OR REPLACE FUNCTION admin.track_table_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO admin.change_history(
    schema_name,
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    changed_by
  )
  VALUES (
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    nullif(current_setting('auth.uid', true), '')::uuid
  );

  RETURN NULL;
END;
$$;

-- Apply tracking trigger to important tables
CREATE TRIGGER track_users_changes
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION admin.track_table_changes();

-- Function to restore a table to a point in time
CREATE OR REPLACE FUNCTION admin.restore_table_to_timestamp(
  p_schema text,
  p_table text,
  p_timestamp timestamptz
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer := 0;
  v_record record;
  v_id uuid;
  v_data jsonb;
BEGIN
  -- First backup current state
  PERFORM admin.backup_table(p_schema, p_table);

  -- Clear current table
  EXECUTE format('TRUNCATE TABLE %I.%I', p_schema, p_table);

  -- Get all records that existed at the specified timestamp
  FOR v_record IN (
    WITH ranked_changes AS (
      SELECT
        record_id,
        operation,
        new_data,
        changed_at,
        ROW_NUMBER() OVER (
          PARTITION BY record_id
          ORDER BY changed_at DESC
        ) as rn
      FROM admin.change_history
      WHERE schema_name = p_schema
        AND table_name = p_table
        AND changed_at <= p_timestamp
    )
    SELECT
      record_id,
      operation,
      new_data
    FROM ranked_changes
    WHERE rn = 1
      AND operation IN ('INSERT', 'UPDATE')
  ) LOOP
    v_id := v_record.record_id;
    v_data := v_record.new_data;

    -- Insert historical data
    EXECUTE format(
      'INSERT INTO %I.%I SELECT * FROM jsonb_populate_record(null::%I.%I, %L)',
      p_schema,
      p_table,
      p_schema,
      p_table,
      v_data
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
```

### 3. Disaster Recovery Procedures

```sql
-- Function to validate database integrity
CREATE OR REPLACE FUNCTION admin.validate_database_integrity()
RETURNS TABLE(
  schema_name text,
  table_name text,
  constraint_name text,
  violation_count bigin
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r record;
  v_query text;
  v_violation_count bigint;
BEGIN
  -- Create temporary table for results
  CREATE TEMP TABLE temp_violations(
    schema_name text,
    table_name text,
    constraint_name text,
    violation_count bigin
  ) ON COMMIT DROP;

  -- Check each table with primary key, foreign key, or unique constraints
  FOR r IN (
    SELECT
      tc.table_schema,
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
      AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
  ) LOOP
    -- Different validation logic based on constraint type
    CASE
      WHEN r.constraint_type = 'PRIMARY KEY' THEN
        v_query := format(
          'SELECT COUNT(*) FROM (
             SELECT %I, COUNT(*)
             FROM %I.%I
             GROUP BY %I
             HAVING COUNT(*) > 1
           ) t',
          -- Get PK column name
          (SELECT column_name
           FROM information_schema.key_column_usage
           WHERE constraint_name = r.constraint_name
           LIMIT 1),
          r.table_schema,
          r.table_name,
          (SELECT column_name
           FROM information_schema.key_column_usage
           WHERE constraint_name = r.constraint_name
           LIMIT 1)
        );

      WHEN r.constraint_type = 'FOREIGN KEY' THEN
        -- More complex, need to get referencing and referenced columns
        -- Simplified for this example
        v_query := format(
          'SELECT COUNT(*) FROM %I.%I
           WHERE %I IS NOT NULL
             AND %I NOT IN (SELECT %I FROM %I.%I)',
          r.table_schema,
          r.table_name,
          -- Get FK column
          (SELECT column_name
           FROM information_schema.key_column_usage
           WHERE constraint_name = r.constraint_name),
          -- Get FK column again
          (SELECT column_name
           FROM information_schema.key_column_usage
           WHERE constraint_name = r.constraint_name),
          -- Get referenced column
          (SELECT ccu.column_name
           FROM information_schema.constraint_column_usage ccu
           JOIN information_schema.referential_constraints rc
             ON rc.unique_constraint_name = ccu.constraint_name
           WHERE rc.constraint_name = r.constraint_name),
          -- Get referenced schema and table
          (SELECT ccu.table_schema
           FROM information_schema.constraint_column_usage ccu
           JOIN information_schema.referential_constraints rc
             ON rc.unique_constraint_name = ccu.constraint_name
           WHERE rc.constraint_name = r.constraint_name),
          (SELECT ccu.table_name
           FROM information_schema.constraint_column_usage ccu
           JOIN information_schema.referential_constraints rc
             ON rc.unique_constraint_name = ccu.constraint_name
           WHERE rc.constraint_name = r.constraint_name)
        );

      WHEN r.constraint_type = 'UNIQUE' THEN
        v_query := format(
          'SELECT COUNT(*) FROM (
             SELECT %I, COUNT(*)
             FROM %I.%I
             GROUP BY %I
             HAVING COUNT(*) > 1
           ) t',
          -- Get UNIQUE column name
          (SELECT column_name
           FROM information_schema.key_column_usage
           WHERE constraint_name = r.constraint_name
           LIMIT 1),
          r.table_schema,
          r.table_name,
          (SELECT column_name
           FROM information_schema.key_column_usage
           WHERE constraint_name = r.constraint_name
           LIMIT 1)
        );
    END CASE;

    -- Execute check and capture violations
    EXECUTE v_query INTO v_violation_count;

    -- Record if violations found
    IF v_violation_count > 0 THEN
      INSERT INTO temp_violations
      VALUES (r.table_schema, r.table_name, r.constraint_name, v_violation_count);
    END IF;
  END LOOP;

  -- Return violations
  RETURN QUERY SELECT * FROM temp_violations;
END;
$$;
```

Remember that well-designed database functions are a critical component of a robust Supabase application architecture. Focus on security, performance, and maintainability to create functions that provide reliable service with minimal overhead.
