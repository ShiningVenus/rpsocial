import type { BlogListItem, PostItem } from "../../models.js";
import type { CurrentUser } from "../../currentUser.js";
import { Layout, PageFrame } from "../../shell/index.js";
import { BlogCardList } from "../blogs/index.js";
import { PostList } from "../posts/index.js";

export function PropsPage(props: { user: CurrentUser; csrf: string; posts: PostItem[]; blogs: BlogListItem[] }) {
  return (
    <Layout title="Your props" user={props.user}>
      <PageFrame title="Your props">
        <p>Posts and blog entries you give props to show up here.</p>
        <h2>Posts</h2>
        <PostList user={props.user} csrf={props.csrf} posts={props.posts} empty="No propped posts yet." />
        <h2>Blog entries</h2>
        <BlogCardList blogs={props.blogs} empty="No propped blog entries yet." />
      </PageFrame>
    </Layout>
  );
}
