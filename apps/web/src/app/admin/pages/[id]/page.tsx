import { PageEditor } from '@/components/admin/PageEditor';

type Props = { params: Promise<{ id: string }> };

export default async function EditPageRoute({ params }: Props) {
  const { id } = await params;
  return <PageEditor pageId={id} />;
}
