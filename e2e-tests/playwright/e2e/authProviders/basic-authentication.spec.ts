import { test, Page, expect } from "@playwright/test";
import { Common, setupBrowser } from "../../utils/common";
import { UIhelper } from "../../utils/ui-helper";
import * as constants from "../../utils/authenticationProviders/constants";
import { dumpAllPodsLogs, dumpRHDHUsersAndGroups } from "../../utils/helper";
import { APIHelper } from "../../utils/api-helper";
import { LOGGER } from "../../utils/logger";
import { HelmActions } from "../../utils/helm";

let page: Page;

test.describe("Standard authentication providers: Basic authentication", () => {
  test.use({ baseURL: constants.AUTH_PROVIDERS_BASE_URL });

  let common: Common;
  let uiHelper: UIhelper;

  test.beforeAll(async ({ browser }, testInfo) => {
    test.setTimeout(120 * 1000);
    page = (await setupBrowser(browser, testInfo)).page;
    common = new Common(page);
    uiHelper = new UIhelper(page);
    expect(process.env.BASE_URL).not.toBeNull();
    LOGGER.info(`Base Url is ${process.env.BASE_URL}`);
    LOGGER.info(
      `Starting scenario: Standard authentication providers: Basic authentication: attemp #${testInfo.retry}`,
    );
  });

  test("1. Verify guest login can work when no auth provider is configured.", async () => {
    test.setTimeout(300 * 1000);
    LOGGER.info(
      "Executing testcase: Verify guest login can work when no auth provider is configured.",
    );

    await HelmActions.upgradeHelmChartWithWait(
      constants.AUTH_PROVIDERS_RELEASE,
      constants.AUTH_PROVIDERS_CHART,
      constants.AUTH_PROVIDERS_NAMESPACE,
      constants.AUTH_PROVIDERS_VALUES_FILE,
      constants.CHART_VERSION,
      constants.QUAY_REPO,
      constants.TAG_NAME,
      [
        "--set upstream.backstage.appConfig.auth.providers.guest.dangerouslyAllowOutsideDevelopment=false",
        "--set upstream.backstage.appConfig.auth.environment=development",
        "--set upstream.backstage.appConfig.catalog.providers=null",
        "--set upstream.backstage.appConfig.permission.enabled=false",
      ],
    );

    // Guest login should work
    await common.loginAsGuest();
    await uiHelper.goToSettingsPage();
    await common.signOut();
  });

  test("2. Login should fail when an authProvider is configured without the ingester.", async () => {
    // Update configuration to setup authentication providers, but no ingesters
    // Since no ingester is configured for Microsoft Auth Provider, the login should fail with the error:
    // "Failed to sign-in, unable to resolve user identity. Please verify that your catalog contains the expected User entities that would match your configured sign-in resolver."

    test.setTimeout(300 * 1000);
    LOGGER.info(
      "Executing testcase: Login should fail when an authProvider is configured without the ingester.",
    );

    await HelmActions.upgradeHelmChartWithWait(
      constants.AUTH_PROVIDERS_RELEASE,
      constants.AUTH_PROVIDERS_CHART,
      constants.AUTH_PROVIDERS_NAMESPACE,
      constants.AUTH_PROVIDERS_VALUES_FILE,
      constants.CHART_VERSION,
      constants.QUAY_REPO,
      constants.TAG_NAME,
      [
        "--set upstream.backstage.appConfig.auth.environment=development",
        "--set upstream.backstage.appConfig.signInPage=microsoft",
        "--set upstream.backstage.appConfig.catalog.providers=null",
        "--set upstream.backstage.appConfig.permission.enabled=false",
      ],
    );

    await common.MicrosoftAzureLogin(
      constants.AZURE_LOGIN_USERNAME,
      constants.AZURE_LOGIN_PASSWORD,
    );

    await uiHelper.verifyAlertErrorMessage(
      /Login failed; caused by Error: Failed to sign-in, unable to resolve user identity./gm,
    );
  });

  test("3. Set dangerouslyAllowSignInWithoutUserInCatalog to true. Login should now work but no User Entities are in the Catalog", async () => {
    // Set upstream.backstage.appConfig.auth.providers.microsoft.development.signIn.resolvers[0].dangerouslyAllowSignInWithoutUserInCatalog = true
    // The Microsoft login should now be successful

    test.setTimeout(300 * 1000);
    LOGGER.info(
      "Execute testcase: Set dangerouslyAllowSignInWithoutUserInCatalog to true. Login should now work but no User Entities are in the Catalog",
    );

    await HelmActions.upgradeHelmChartWithWait(
      constants.AUTH_PROVIDERS_RELEASE,
      constants.AUTH_PROVIDERS_CHART,
      constants.AUTH_PROVIDERS_NAMESPACE,
      constants.AUTH_PROVIDERS_VALUES_FILE,
      constants.CHART_VERSION,
      constants.QUAY_REPO,
      constants.TAG_NAME,
      [
        "--set upstream.backstage.appConfig.auth.environment=development",
        "--set upstream.backstage.appConfig.signInPage=microsoft",
        "--set upstream.backstage.appConfig.auth.providers.microsoft.development.signIn.resolvers[0].resolver=userIdMatchingUserEntityAnnotation",
        "--set upstream.backstage.appConfig.auth.providers.microsoft.development.signIn.resolvers[0].dangerouslyAllowSignInWithoutUserInCatalog=true",
        "--set upstream.backstage.appConfig.catalog.providers=null",
        "--set upstream.backstage.appConfig.permission.enabled=false",
      ],
    );

    await common.MicrosoftAzureLogin(
      constants.AZURE_LOGIN_USERNAME,
      constants.AZURE_LOGIN_PASSWORD,
    );

    await uiHelper.goToSettingsPage();
    await uiHelper.verifyParagraph(constants.AZURE_LOGIN_USERNAME);

    // check no entities are in the catalog
    const api = new APIHelper();
    api.UseStaticToken(constants.STATIC_API_TOKEN);
    const catalogUsers = await api.getAllCatalogUsersFromAPI();
    expect(catalogUsers.totalItems).toBe(0);
    await uiHelper.goToSettingsPage();
    await common.signOut();
  });

  test("3. Ensure Guest login is disabled when setting environment to production", async () => {
    // Set upstream.backstage.appConfig.dangerouslyAllowSignInWithoutUserInCatalog = true
    // The Microsoft login should now be successful

    test.setTimeout(300 * 1000);
    LOGGER.info(
      "Execute testcase: Ensure Guest login is disabled when setting environment to production",
    );

    await HelmActions.upgradeHelmChartWithWait(
      constants.AUTH_PROVIDERS_RELEASE,
      constants.AUTH_PROVIDERS_CHART,
      constants.AUTH_PROVIDERS_NAMESPACE,
      constants.AUTH_PROVIDERS_VALUES_FILE,
      constants.CHART_VERSION,
      constants.QUAY_REPO,
      constants.TAG_NAME,
      [
        "--set upstream.backstage.appConfig.auth.environment=production",
        "--set upstream.backstage.appConfig.signInPage=microsoft",
        "--set upstream.backstage.appConfig.auth.providers.microsoft.production.signIn.resolvers[0].resolver=userIdMatchingUserEntityAnnotation",
        "--set upstream.backstage.appConfig.auth.providers.microsoft.production.signIn.resolvers[0].dangerouslyAllowSignInWithoutUserInCatalog=true",
        "--set upstream.backstage.appConfig.catalog.providers=null",
        "--set upstream.backstage.appConfig.permission.enabled=false",
      ],
    );

    await page.goto("/");
    await uiHelper.verifyHeading("Select a sign-in method");
    const singInMethods = await page
      .locator("div[class^='MuiCardHeader-root']")
      .allInnerTexts();
    expect(singInMethods).not.toContain("Guest");
  });

  test.afterEach(async () => {
    if (test.info().status !== test.info().expectedStatus) {
      const prefix = `${test.info().testId}_${test.info().retry}`;
      LOGGER.info(`Dumping logs with prefix ${prefix}`);
      await dumpAllPodsLogs(prefix, constants.LOGS_FOLDER);
      await dumpRHDHUsersAndGroups(prefix, constants.LOGS_FOLDER);
    }
  });
});
