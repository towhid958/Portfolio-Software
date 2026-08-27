
CREATE TABLE public.client_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'in_progress',
  progress integer NOT NULL DEFAULT 0,
  budget numeric,
  currency text NOT NULL DEFAULT 'USD',
  manager_name text,
  start_date date,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_projects TO authenticated;
GRANT ALL ON public.client_projects TO service_role;
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients read own projects" ON public.client_projects
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Admins manage projects" ON public.client_projects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.client_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.client_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_tasks TO authenticated;
GRANT ALL ON public.client_tasks TO service_role;
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients read own tasks" ON public.client_tasks
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Clients update own tasks" ON public.client_tasks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage tasks" ON public.client_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_client_projects_updated_at BEFORE UPDATE ON public.client_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_client_tasks_updated_at BEFORE UPDATE ON public.client_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.client_projects (id, user_id, name, description, status, progress, budget, manager_name, start_date, due_date) VALUES
  ('11111111-1111-4111-8111-111111111101','645d5b7c-c50f-4d29-9872-3040ac2943c5','Shopify Store Revamp','Full redesign and conversion optimization of the Optosoft storefront.','in_progress',65,3500,'Hasan Kamrul','2026-07-15','2026-09-10'),
  ('11111111-1111-4111-8111-111111111102','645d5b7c-c50f-4d29-9872-3040ac2943c5','Google Ads Q3 Campaign','Performance campaign management with weekly reporting.','in_progress',40,1800,'Hasan Kamrul','2026-08-01','2026-10-01'),
  ('11111111-1111-4111-8111-111111111103','645d5b7c-c50f-4d29-9872-3040ac2943c5','Brand Identity Refresh','Logo system, typography and brand guidelines.','completed',100,1200,'Hasan Kamrul','2026-05-02','2026-06-20'),
  ('11111111-1111-4111-8111-111111111104','41975de6-db57-4608-88fd-8ae7fd22bb19','SEO Foundation Audit','Technical SEO audit and 90-day roadmap.','in_progress',25,900,'Hasan Kamrul','2026-08-10','2026-09-30');

INSERT INTO public.client_tasks (project_id, user_id, title, description, status, priority, due_date) VALUES
  ('11111111-1111-4111-8111-111111111101','645d5b7c-c50f-4d29-9872-3040ac2943c5','Approve homepage design','Review the Figma homepage concept and leave comments.','pending','high','2026-08-28'),
  ('11111111-1111-4111-8111-111111111101','645d5b7c-c50f-4d29-9872-3040ac2943c5','Provide product photography','Upload high-resolution images for the top 20 products.','in_progress','medium','2026-09-01'),
  ('11111111-1111-4111-8111-111111111101','645d5b7c-c50f-4d29-9872-3040ac2943c5','Share Shopify admin access','Invite the team as staff with limited permissions.','completed','high','2026-07-20'),
  ('11111111-1111-4111-8111-111111111102','645d5b7c-c50f-4d29-9872-3040ac2943c5','Confirm monthly ad budget','Approve the proposed $600/month spend split.','pending','high','2026-08-27'),
  ('11111111-1111-4111-8111-111111111102','645d5b7c-c50f-4d29-9872-3040ac2943c5','Review keyword list','Validate the 120 keyword shortlist for relevance.','pending','medium','2026-09-05'),
  ('11111111-1111-4111-8111-111111111103','645d5b7c-c50f-4d29-9872-3040ac2943c5','Sign off brand guidelines','Final approval of the 24-page brand book.','completed','low','2026-06-18'),
  ('11111111-1111-4111-8111-111111111104','41975de6-db57-4608-88fd-8ae7fd22bb19','Grant Search Console access','Add the auditor as a full user.','pending','high','2026-08-30');
