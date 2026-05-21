import type { CurrentUser } from "../../currentUser.js";
import { characterRangeLabel, limits } from "../../policy.js";
import { CsrfInput, FormActions, FormError, FormField, FormStack } from "../../ui/forms.js";
import { Layout, PageFrame } from "../../shell/index.js";
import { Panel } from "../../ui/panels.js";

export function SignUpPage(props: { user: CurrentUser | null; csrf: string; initialEmail?: string; initialHandle?: string; message?: string }) {
  return (
    <Layout title="Sign up" user={props.user}>
      <PageFrame className="signup-page" title="Sign up">
        <Panel className="benefits-panel" title="Benefits">
          <ul class="benefits-panel__list">
            <li>Custom profiles and wall posts</li>
            <li>Blogs and groups</li>
            <li>No tracking, ads, or feed algorithm</li>
            <li>Open source and self-hostable</li>
          </ul>
        </Panel>
        <FormError>{props.message}</FormError>
        <FormStack action="/signup">
          <CsrfInput csrf={props.csrf} />
          <FormField label="Display name">
            <input required placeholder="Display name" type="text" name="username" autocomplete="name" maxLength={limits.usernameMax} />
          </FormField>
          <FormField label="Handle" hint={`Your public profile URL will be /u/handle. Use ${characterRangeLabel(limits.handleMin, limits.handleMax)} with letters, numbers, and dashes.`}>
            <input required placeholder="handle" type="text" name="handle" autocomplete="username" maxLength={limits.handleMax} value={props.initialHandle ?? ""} />
          </FormField>
          <FormField label="Email">
            <input required placeholder="Email" type="email" name="email" autocomplete="email" maxLength={limits.emailMax} value={props.initialEmail ?? ""} />
          </FormField>
          <FormField label="Password">
            <input required placeholder="Password" type="password" name="password" autocomplete="new-password" minLength={limits.passwordMin} />
          </FormField>
          <FormField label="Confirm password">
            <input required placeholder="Confirm password" type="password" name="confirm" autocomplete="new-password" minLength={limits.passwordMin} />
          </FormField>
          <div class="form-checks signup-terms">
            <label>
              <input type="checkbox" name="terms" value="accepted" required />
              <span>I'm 13+ and agree to the <a href="/terms">terms</a>, <a href="/privacy">privacy</a> and <a href="/rules">rules</a>.</span>
            </label>
          </div>
          <FormActions>
            <button type="submit">Sign up</button>
          </FormActions>
        </FormStack>
      </PageFrame>
    </Layout>
  );
}
