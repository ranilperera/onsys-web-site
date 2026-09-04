import { PostEditor } from '@/components/admin/PostEditor';

type Props = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  return <PostEditor postId={id} />;
}
