import * as React from 'react';
import Helmet from 'react-helmet';

import HeadLinks from 'amo/components/HeadLinks';
import HeadMetaTags from 'amo/components/HeadMetaTags';
import AddonHead, { AddonHeadBase } from 'amo/components/AddonHead';
import {
  ADDON_TYPE_DICT,
  ADDON_TYPE_EXTENSION,
  ADDON_TYPE_LANG,
  ADDON_TYPE_OPENSEARCH,
  ADDON_TYPE_STATIC_THEME,
  CLIENT_APP_ANDROID,
  CLIENT_APP_FIREFOX,
} from 'core/constants';
import { createInternalAddon } from 'core/reducers/addons';
import { createInternalVersion, loadVersions } from 'core/reducers/versions';
import {
  dispatchClientMetadata,
  fakeAddon,
  fakeI18n,
  shallowUntilTarget,
} from 'tests/unit/helpers';

describe(__filename, () => {
  const render = ({
    store = dispatchClientMetadata().store,
    ...props
  } = {}) => {
    return shallowUntilTarget(
      <AddonHead i18n={fakeI18n()} store={store} {...props} />,
      AddonHeadBase,
    );
  };

  it('renders nothing when no add-on is passed', () => {
    const root = render();

    expect(root.find(Helmet)).toHaveLength(0);
  });

  it.each([
    [ADDON_TYPE_DICT, 'Dictionary'],
    [ADDON_TYPE_EXTENSION, 'Extension'],
    [ADDON_TYPE_LANG, 'Language Pack'],
    [ADDON_TYPE_OPENSEARCH, 'Search Tool'],
    [ADDON_TYPE_STATIC_THEME, 'Theme'],
  ])('renders an HTML title for Firefox (add-on type: %s)', (type, name) => {
    const lang = 'fr';
    const addon = createInternalAddon({ ...fakeAddon, type });
    const { store } = dispatchClientMetadata({
      clientApp: CLIENT_APP_FIREFOX,
      lang,
    });
    const root = render({ addon, store });

    expect(root.find('title')).toHaveText(
      `${addon.name} – Get this ${name} for 🦊 Firefox (${lang})`,
    );
  });

  it.each([
    [ADDON_TYPE_DICT, 'Dictionary'],
    [ADDON_TYPE_EXTENSION, 'Extension'],
    [ADDON_TYPE_LANG, 'Language Pack'],
    [ADDON_TYPE_OPENSEARCH, 'Search Tool'],
    [ADDON_TYPE_STATIC_THEME, 'Theme'],
  ])('renders an HTML title for Android (add-on type: %s)', (type, name) => {
    const lang = 'fr';
    const addon = createInternalAddon({ ...fakeAddon, type });
    const { store } = dispatchClientMetadata({
      clientApp: CLIENT_APP_ANDROID,
      lang,
    });
    const root = render({ addon, store });

    expect(root.find('title')).toHaveText(
      `${addon.name} – Get this ${name} for 🦊 Firefox Android (${lang})`,
    );
  });

  it('renders a HeadMetaTags component', () => {
    const addon = createInternalAddon(fakeAddon);
    const lang = 'fr';
    const { store } = dispatchClientMetadata({
      clientApp: CLIENT_APP_ANDROID,
      lang,
    });

    const root = render({ addon, store });

    expect(root.find(HeadMetaTags)).toHaveLength(1);
    expect(root.find(HeadMetaTags)).toHaveProp('appendDefaultTitle', false);
    expect(root.find(HeadMetaTags)).toHaveProp('date', addon.created);
    expect(root.find(HeadMetaTags)).toHaveProp(
      'description',
      `Download ${addon.name} for Firefox. ${addon.summary}`,
    );
    expect(root.find(HeadMetaTags)).toHaveProp(
      'image',
      addon.previews[0].image_url,
    );
    expect(root.find(HeadMetaTags)).toHaveProp(
      'lastModified',
      addon.last_updated,
    );
    expect(root.find(HeadMetaTags)).toHaveProp(
      'title',
      `${addon.name} – Get this Extension for 🦊 Firefox Android (${lang})`,
    );
    expect(root.find(HeadMetaTags)).toHaveProp('withTwitterMeta', true);
  });

  it('renders JSON linked data', () => {
    const addon = createInternalAddon(fakeAddon);
    const root = render({ addon });

    expect(root.find('script[type="application/ld+json"]')).toHaveLength(1);
  });

  it('passes both an addon and a currentVersion when rendering JSON linked data', () => {
    const { store } = dispatchClientMetadata();
    const addon = createInternalAddon(fakeAddon);
    store.dispatch(
      loadVersions({
        slug: fakeAddon.slug,
        versions: [fakeAddon.current_version],
      }),
    );

    const currentVersion = createInternalVersion(fakeAddon.current_version);
    const _getAddonJsonLinkedData = sinon.spy();

    render({ _getAddonJsonLinkedData, addon, store });

    sinon.assert.calledWith(_getAddonJsonLinkedData, { addon, currentVersion });
  });

  it('renders a HeadLinks component', () => {
    const addon = createInternalAddon(fakeAddon);

    const root = render({ addon });

    expect(root.find(HeadLinks)).toHaveLength(1);
  });
});
