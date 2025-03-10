import * as React from 'react';
import config from 'config';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'redux';

import { setViewContext } from 'amo/actions/viewContext';
import CategoryIcon from 'amo/components/CategoryIcon';
import { categoryResultsLinkTo } from 'amo/components/Categories';
import FeaturedCollectionCard from 'amo/components/FeaturedCollectionCard';
import HomeHeroGuides from 'amo/components/HomeHeroGuides';
import HeadLinks from 'amo/components/HeadLinks';
import HeadMetaTags from 'amo/components/HeadMetaTags';
import HeroRecommendation from 'amo/components/HeroRecommendation';
import LandingAddonsCard from 'amo/components/LandingAddonsCard';
import Link from 'amo/components/Link';
import Page from 'amo/components/Page';
import SecondaryHero from 'amo/components/SecondaryHero';
import { fetchHomeData } from 'amo/reducers/home';
import {
  ADDON_TYPE_EXTENSION,
  ADDON_TYPE_STATIC_THEME,
  CLIENT_APP_ANDROID,
  INSTALL_SOURCE_FEATURED,
  SEARCH_SORT_POPULAR,
  SEARCH_SORT_RANDOM,
  SEARCH_SORT_TRENDING,
  VIEW_CONTEXT_HOME,
} from 'core/constants';
import { withErrorHandler } from 'core/errorHandler';
import translate from 'core/i18n/translate';
import Card from 'ui/components/Card';

import './styles.scss';

export const MOZILLA_USER_ID = config.get('mozillaUserId');

export const FEATURED_COLLECTIONS = [
  { slug: 'privacy-matters', userId: MOZILLA_USER_ID },
  { slug: 'password-managers', userId: MOZILLA_USER_ID },
];

export const isFeaturedCollection = (
  collection,
  { featuredCollections = FEATURED_COLLECTIONS } = {},
) => {
  return featuredCollections.some((featured) => {
    return (
      featured.slug === collection.slug &&
      featured.userId === collection.authorId
    );
  });
};

export const getFeaturedCollectionsMetadata = (i18n) => {
  return [
    {
      footerText: i18n.gettext('See more enhanced privacy extensions'),
      header: i18n.gettext('Enhanced privacy extensions'),
      isTheme: false,
      ...FEATURED_COLLECTIONS[0],
    },
    {
      footerText: i18n.gettext('See more recommended password managers'),
      header: i18n.gettext('Recommended password managers'),
      isTheme: false,
      ...FEATURED_COLLECTIONS[1],
    },
  ];
};

export class HomeBase extends React.Component {
  static propTypes = {
    _config: PropTypes.object,
    _getFeaturedCollectionsMetadata: PropTypes.func,
    clientApp: PropTypes.string.isRequired,
    collections: PropTypes.array.isRequired,
    dispatch: PropTypes.func.isRequired,
    errorHandler: PropTypes.object.isRequired,
    heroShelves: PropTypes.object,
    i18n: PropTypes.object.isRequired,
    includeRecommendedThemes: PropTypes.bool,
    includeTrendingExtensions: PropTypes.bool,
    isLoading: PropTypes.bool,
    resultsLoaded: PropTypes.bool.isRequired,
    shelves: PropTypes.object.isRequired,
  };

  static defaultProps = {
    _config: config,
    _getFeaturedCollectionsMetadata: getFeaturedCollectionsMetadata,
    includeRecommendedThemes: true,
    includeTrendingExtensions: false,
  };

  constructor(props) {
    super(props);

    this.loadDataIfNeeded();
  }

  componentDidUpdate() {
    this.loadDataIfNeeded();
  }

  loadDataIfNeeded() {
    const {
      dispatch,
      errorHandler,
      includeRecommendedThemes,
      includeTrendingExtensions,
      isLoading,
      resultsLoaded,
    } = this.props;

    if (errorHandler.hasError()) {
      return;
    }

    dispatch(setViewContext(VIEW_CONTEXT_HOME));

    if (!resultsLoaded && !isLoading) {
      dispatch(
        fetchHomeData({
          collectionsToFetch: FEATURED_COLLECTIONS,
          errorHandlerId: errorHandler.id,
          includeRecommendedThemes,
          includeTrendingExtensions,
        }),
      );
    }
  }

  renderCuratedThemes() {
    const { i18n } = this.props;
    const curatedThemes = [
      {
        color: 1,
        slug: 'abstract',
        title: i18n.gettext('Abstract'),
      },
      {
        color: 2,
        slug: 'nature',
        title: i18n.gettext('Nature'),
      },
      {
        color: 3,
        slug: 'film-and-tv',
        title: i18n.gettext('Film & TV'),
      },
      {
        color: 4,
        slug: 'scenery',
        title: i18n.gettext('Scenery'),
      },
      {
        color: 5,
        slug: 'music',
        title: i18n.gettext('Music'),
      },
      {
        color: 6,
        slug: 'seasonal',
        title: i18n.gettext('Seasonal'),
      },
    ];

    return (
      <ul className="Home-SubjectShelf-list">
        {curatedThemes.map(({ color, slug, title }) => (
          <li className="Home-SubjectShelf-list-item" key={slug}>
            <Link
              to={categoryResultsLinkTo({
                addonType: ADDON_TYPE_STATIC_THEME,
                slug,
              })}
              className="Home-SubjectShelf-link"
            >
              <CategoryIcon name={slug} color={color} />
              <span>{title}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  render() {
    const {
      _config,
      _getFeaturedCollectionsMetadata,
      clientApp,
      collections,
      errorHandler,
      heroShelves,
      i18n,
      includeRecommendedThemes,
      includeTrendingExtensions,
      resultsLoaded,
      shelves,
    } = this.props;

    const themesHeader = i18n.gettext(`Change the way Firefox looks with
      themes.`);

    const featuredCollectionsMetadata = _getFeaturedCollectionsMetadata(i18n);

    const loading = resultsLoaded === false;

    // This is a helper function (closure) configured to render a featured
    // collection by index.
    const renderFeaturedCollection = (index) => {
      const metadata = featuredCollectionsMetadata[index];

      const collection = collections[index];
      if (loading || collection) {
        return (
          <FeaturedCollectionCard
            addons={collection}
            className="Home-FeaturedCollection"
            loading={loading}
            {...metadata}
          />
        );
      }

      return null;
    };

    const showHeroPromo =
      _config.get('enableFeatureHeroRecommendation') &&
      clientApp !== CLIENT_APP_ANDROID;

    return (
      <Page isHomePage showWrongPlatformWarning={!showHeroPromo}>
        <div className="Home">
          <HeadMetaTags
            description={i18n.gettext(`Download Firefox extensions and themes.
            They’re like apps for your browser. They can block annoying ads,
            protect passwords, change browser appearance, and more.`)}
            withTwitterMeta
          />

          <HeadLinks />

          <span
            className="visually-hidden do-not-remove"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: '<!-- Godzilla of browsers -->',
            }}
          />

          {!showHeroPromo && errorHandler.hasError() ? (
            <div className="Home-noHeroError">{errorHandler.renderError()}</div>
          ) : null}

          {showHeroPromo ? (
            <HeroRecommendation
              errorHandler={errorHandler}
              shelfData={heroShelves && heroShelves.primary}
            />
          ) : null}

          <div className="Home-content">
            {showHeroPromo ? (
              <SecondaryHero shelfData={heroShelves && heroShelves.secondary} />
            ) : null}

            {!showHeroPromo ? <HomeHeroGuides /> : null}

            <LandingAddonsCard
              addonInstallSource={INSTALL_SOURCE_FEATURED}
              addons={shelves.recommendedExtensions}
              className="Home-RecommendedExtensions"
              header={i18n.gettext('Recommended extensions')}
              footerText={i18n.gettext('See more recommended extensions')}
              footerLink={{
                pathname: '/search/',
                query: {
                  addonType: ADDON_TYPE_EXTENSION,
                  recommended: true,
                  sort: SEARCH_SORT_RANDOM,
                },
              }}
              loading={loading}
            />

            <LandingAddonsCard
              addonInstallSource={INSTALL_SOURCE_FEATURED}
              addons={shelves.popularThemes}
              className="Home-PopularThemes"
              header={i18n.gettext('Popular themes')}
              footerText={i18n.gettext('See more popular themes')}
              footerLink={{
                pathname: '/search/',
                query: {
                  addonType: ADDON_TYPE_STATIC_THEME,
                  sort: SEARCH_SORT_POPULAR,
                },
              }}
              isTheme
              loading={loading}
            />

            {renderFeaturedCollection(0)}

            <LandingAddonsCard
              addonInstallSource={INSTALL_SOURCE_FEATURED}
              addons={shelves.popularExtensions}
              className="Home-PopularExtensions"
              header={i18n.gettext('Popular extensions')}
              footerText={i18n.gettext('See more popular extensions')}
              footerLink={{
                pathname: '/search/',
                query: {
                  addonType: ADDON_TYPE_EXTENSION,
                  recommended: true,
                  sort: SEARCH_SORT_POPULAR,
                },
              }}
              loading={loading}
            />

            {includeRecommendedThemes && (
              <LandingAddonsCard
                addonInstallSource={INSTALL_SOURCE_FEATURED}
                addons={shelves.recommendedThemes}
                className="Home-RecommendedThemes"
                footerText={i18n.gettext('See more recommended themes')}
                footerLink={{
                  pathname: '/search/',
                  query: {
                    addonType: ADDON_TYPE_STATIC_THEME,
                    recommended: true,
                    sort: SEARCH_SORT_RANDOM,
                  },
                }}
                header={i18n.gettext('Recommended themes')}
                isTheme
                loading={loading}
              />
            )}

            {renderFeaturedCollection(1)}

            {includeTrendingExtensions && (
              <LandingAddonsCard
                addonInstallSource={INSTALL_SOURCE_FEATURED}
                addons={shelves.trendingExtensions}
                className="Home-TrendingExtensions"
                header={i18n.gettext('Trending extensions')}
                footerText={i18n.gettext('See more trending extensions')}
                footerLink={{
                  pathname: '/search/',
                  query: {
                    addonType: ADDON_TYPE_EXTENSION,
                    recommended: true,
                    sort: SEARCH_SORT_TRENDING,
                  },
                }}
                loading={loading}
              />
            )}

            <Card
              className="Home-SubjectShelf Home-CuratedThemes"
              header={themesHeader}
            >
              <div className="Home-SubjectShelf-text-wrapper">
                <h2 className="Home-SubjectShelf-subheading">{themesHeader}</h2>
              </div>

              {this.renderCuratedThemes()}
            </Card>
          </div>
        </div>
      </Page>
    );
  }
}

export function mapStateToProps(state) {
  return {
    clientApp: state.api.clientApp,
    collections: state.home.collections,
    heroShelves: state.home.heroShelves,
    isLoading: state.home.isLoading,
    resultsLoaded: state.home.resultsLoaded,
    shelves: state.home.shelves,
  };
}

export default compose(
  connect(mapStateToProps),
  translate(),
  withErrorHandler({ name: 'Home' }),
)(HomeBase);
