DROP POLICY IF EXISTS "Signed-in users see all deposits" ON public.deposits;
CREATE POLICY "Group members see deposits" ON public.deposits FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'member') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Signed-in users see all profiles" ON public.profiles;
CREATE POLICY "Group members see profiles" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'member') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Signed-in users see roles" ON public.user_roles;
CREATE POLICY "Users see own roles, admins see all" ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Signed-in users view receipts" ON storage.objects;
CREATE POLICY "Owners and admins view receipts" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts' AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.has_role(auth.uid(), 'admin')));