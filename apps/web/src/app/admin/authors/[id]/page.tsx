import { AuthorEditor } from '@/components/admin/AuthorEditor';

type Props = { params: Promise<{ id: string }> };

export default async function EditAuthorPage({ params }: Props) {
  const { id } = await params;
  return <AuthorEditor authorId={id} />;
}
