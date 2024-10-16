import { test, Page } from '@playwright/test';
import { UIhelper } from '../utils/UIhelper';
import { Common, setupBrowser } from '../utils/Common';
import { runShellCmd } from '../utils/helper';
import path from 'path';
import { logger } from '../utils/authenticationProviders/Logger';


let page: Page;

test.describe('TechDocs', () => {
  let common: Common;
  let uiHelper: UIhelper;


  test.beforeAll(async ({ browser }, testInfo) => {
    page = (await setupBrowser(browser, testInfo)).page;
    common = new Common(page);
    uiHelper = new UIhelper(page);
  });


  test('Community plugin', async () => {
    test.setTimeout(5 * 60 * 1000);
    logger.info('Executing testcase: Community plugin');


    let output = await runShellCmd(path.join("playwright/e2e", 'build-community-plugins.sh'));

    console.log(output);

    await common.loginAsGuest();

  });

});
