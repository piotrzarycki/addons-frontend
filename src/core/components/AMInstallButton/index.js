/* @flow */
/* global window */
import makeClassName from 'classnames';
import config from 'config';
import invariant from 'invariant';
import * as React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import {
  EXPERIMENT_CATEGORY_CLICK,
  EXPERIMENT_ID,
  VARIANT_INCLUDE_WARNING,
  VARIANT_EXCLUDE_WARNING,
} from 'amo/components/InstallWarning';
import {
  ADDON_TYPE_EXTENSION,
  ADDON_TYPE_OPENSEARCH,
  ADDON_TYPE_STATIC_THEME,
  CLIENT_APP_FIREFOX,
  DISABLED,
  DOWNLOADING,
  ENABLED,
  ENABLING,
  INACTIVE,
  INSTALLED,
  INSTALLING,
  INSTALL_ACTION,
  INSTALL_STARTED_ACTION,
  UNINSTALLING,
  UNKNOWN,
} from 'core/constants';
import translate from 'core/i18n/translate';
import { findInstallURL } from 'core/installAddon';
import log from 'core/logger';
import tracking, {
  getAddonTypeForTracking,
  getAddonEventCategory,
} from 'core/tracking';
import { isTheme } from 'core/utils';
import { isFirefox } from 'core/utils/compatibility';
import { NOT_IN_EXPERIMENT, withExperiment } from 'core/withExperiment';
import Button from 'ui/components/Button';
import Icon from 'ui/components/Icon';
import type { AddonVersionType } from 'core/reducers/versions';
import type { AppState } from 'amo/store';
import type { WithInstallHelpersInjectedProps } from 'core/installAddon';
import type { UserAgentInfoType } from 'core/reducers/api';
import type { AddonType } from 'core/types/addons';
import type { I18nType } from 'core/types/i18n';
import type { ReactRouterLocationType } from 'core/types/router';
import type { WithExperimentInjectedProps } from 'core/withExperiment';
import type { ButtonType } from 'ui/components/Button';

import './styles.scss';

type Props = {|
  ...WithInstallHelpersInjectedProps,
  addon: AddonType,
  className?: string,
  currentVersion: AddonVersionType | null,
  defaultButtonText?: string,
  defaultInstallSource: string,
  disabled: boolean,
  puffy?: boolean,
  status: string,
|};

type InternalProps = {|
  ...Props,
  ...WithExperimentInjectedProps,
  _config: typeof config,
  _log: typeof log,
  _tracking: typeof tracking,
  _window: typeof window,
  clientApp: string,
  i18n: I18nType,
  location: ReactRouterLocationType,
  userAgentInfo: UserAgentInfoType,
|};

type TrackParams = {|
  addonName: string,
  type: string,
|};

type ButtonProps = {|
  buttonType: ButtonType,
  className: string,
  disabled: boolean,
  href: string | void,
  onClick: Function | null,
  puffy: boolean,
|};

const TRANSITION_TIMEOUT = 150;

export class AMInstallButtonBase extends React.Component<InternalProps> {
  static defaultProps = {
    _config: config,
    _log: log,
    _tracking: tracking,
    _window: typeof window !== 'undefined' ? window : {},
    puffy: true,
  };

  installOpenSearch = (event: SyntheticEvent<HTMLAnchorElement>) => {
    const { _log, _window, addon } = this.props;

    event.preventDefault();
    event.stopPropagation();

    const installURL = event.currentTarget.href;

    // eslint-disable-next-line amo/only-log-strings
    _log.info('Adding OpenSearch Provider', { addon });
    _window.external.AddSearchProvider(installURL);

    const { name: addonName, type } = addon;

    this.trackInstallStarted({ addonName, type });
    this.trackInstallSucceeded({ addonName, type });

    return false;
  };

  installExtension = async (event: SyntheticEvent<HTMLAnchorElement>) => {
    const {
      _tracking,
      addon,
      clientApp,
      enable,
      install,
      isAddonEnabled,
      variant,
    } = this.props;

    if (
      addon.type === ADDON_TYPE_EXTENSION &&
      clientApp === CLIENT_APP_FIREFOX
    ) {
      const category = `${EXPERIMENT_CATEGORY_CLICK}-${
        !addon.is_recommended ? 'not_' : ''
      }recommended`;
      _tracking.sendEvent({
        action: variant || NOT_IN_EXPERIMENT,
        category,
        label: addon.name,
      });
    }

    event.preventDefault();
    event.stopPropagation();

    await install();

    if (addon.type === ADDON_TYPE_STATIC_THEME) {
      const isEnabled = await isAddonEnabled();

      if (!isEnabled) {
        await enable({ sendTrackingEvent: false });
      }
    }

    return false;
  };

  uninstallAddon = (event: SyntheticEvent<HTMLAnchorElement>) => {
    const { addon, uninstall } = this.props;
    const { guid, name, type } = addon;

    event.preventDefault();
    event.stopPropagation();

    uninstall({ guid, name, type });

    return false;
  };

  enableAddon = (event: SyntheticEvent<HTMLAnchorElement>) => {
    const { enable } = this.props;

    event.preventDefault();
    event.stopPropagation();

    enable();

    return false;
  };

  trackInstallStarted({ addonName, type }: TrackParams) {
    const { _tracking } = this.props;

    _tracking.sendEvent({
      action: getAddonTypeForTracking(type),
      category: getAddonEventCategory(type, INSTALL_STARTED_ACTION),
      label: addonName,
    });
  }

  trackInstallSucceeded({ addonName, type }: TrackParams) {
    const { _tracking } = this.props;

    _tracking.sendEvent({
      action: getAddonTypeForTracking(type),
      category: getAddonEventCategory(type, INSTALL_ACTION),
      label: addonName,
    });
  }

  showLoadingAnimation() {
    const { addon, status } = this.props;

    if (addon.type === ADDON_TYPE_STATIC_THEME && status === INSTALLED) {
      // We have to enable a static theme after having installed it, so we keep
      // the animation visible to avoid flickering.
      return true;
    }

    return [DOWNLOADING, ENABLING, INSTALLING, UNINSTALLING].includes(status);
  }

  getButtonText() {
    const { addon, i18n, status, defaultButtonText } = this.props;

    switch (status) {
      case DISABLED:
        return i18n.gettext('Enable');
      case ENABLED:
      case INSTALLED:
        return i18n.gettext('Remove');
      case ENABLING:
        return i18n.gettext('Enabling');
      case DOWNLOADING:
        return i18n.gettext('Downloading');
      case INSTALLING:
        return i18n.gettext('Installing');
      case UNINSTALLING:
        return i18n.gettext('Uninstalling');
      case INACTIVE:
      default:
        if (defaultButtonText) {
          return defaultButtonText;
        }

        return isTheme(addon.type)
          ? i18n.gettext('Install Theme')
          : i18n.gettext('Add to Firefox');
    }
  }

  getIconName() {
    const { status } = this.props;

    switch (status) {
      case DISABLED:
        return 'plus-dark';
      case ENABLED:
      case INSTALLED:
        return 'delete';
      default:
        return 'plus';
    }
  }

  render() {
    const {
      _config,
      _log,
      addon,
      className,
      currentVersion,
      defaultInstallSource,
      disabled,
      hasAddonManager,
      location,
      status,
      userAgentInfo,
    } = this.props;

    if (!isFirefox({ userAgentInfo })) {
      return null;
    }

    if (addon.type === ADDON_TYPE_OPENSEARCH && _config.get('server')) {
      _log.info('Not rendering opensearch install button on the server');
      return null;
    }

    const installURL = currentVersion
      ? findInstallURL({
          defaultInstallSource,
          location,
          platformFiles: currentVersion.platformFiles,
          userAgentInfo,
        })
      : undefined;

    const buttonIsDisabled =
      disabled === true || !installURL
        ? true
        : hasAddonManager &&
          status === UNKNOWN &&
          addon.type !== ADDON_TYPE_OPENSEARCH;

    invariant(this.props.puffy !== undefined, 'puffy prop is required');
    const buttonProps: ButtonProps = {
      buttonType: 'action',
      className: 'AMInstallButton-button',
      disabled: buttonIsDisabled,
      href: installURL,
      onClick: hasAddonManager
        ? (event) => {
            event.preventDefault();
            event.stopPropagation();

            return false;
          }
        : null,
      puffy: this.props.puffy,
    };

    if (!buttonIsDisabled) {
      if ([ENABLED, INSTALLED].includes(status)) {
        buttonProps.buttonType = 'neutral';
        buttonProps.onClick = this.uninstallAddon;
        buttonProps.className = makeClassName(
          buttonProps.className,
          'AMInstallButton-button--uninstall',
        );
      } else if (status === DISABLED) {
        buttonProps.buttonType = 'neutral';
        buttonProps.onClick = this.enableAddon;
        buttonProps.className = makeClassName(
          buttonProps.className,
          'AMInstallButton-button--enable',
        );
      } else if (addon.type === ADDON_TYPE_OPENSEARCH) {
        buttonProps.onClick = this.installOpenSearch;
      } else if (hasAddonManager) {
        buttonProps.onClick = this.installExtension;
      }
    }

    const transitionProps = {
      classNames: 'AMInstallButton-transition',
      timeout: TRANSITION_TIMEOUT,
    };

    const buttonText = this.getButtonText();

    return (
      <TransitionGroup className={makeClassName('AMInstallButton', className)}>
        {this.showLoadingAnimation() ? (
          <CSSTransition key="loading" {...transitionProps}>
            <div
              className={makeClassName('AMInstallButton-loading-button', {
                'AMInstallButton-loading-button--puffy': this.props.puffy,
              })}
              title={buttonText}
            >
              <div className="AMInstallButton-loader">
                <div className="AMInstallButton-loader-container">
                  <div className="AMInstallButton-loader-ball" />
                </div>
                <span className="visually-hidden">{buttonText}</span>
              </div>
            </div>
          </CSSTransition>
        ) : (
          <CSSTransition key="button" {...transitionProps}>
            <Button {...buttonProps}>
              <Icon name={this.getIconName()} />
              {buttonText}
            </Button>
          </CSSTransition>
        )}
      </TransitionGroup>
    );
  }
}

export function mapStateToProps(state: AppState) {
  return {
    clientApp: state.api.clientApp,
    userAgentInfo: state.api.userAgentInfo,
  };
}

const AMInstallButton: React.ComponentType<Props> = compose(
  withRouter,
  connect(mapStateToProps),
  translate(),
  withExperiment({
    id: EXPERIMENT_ID,
    variantA: VARIANT_INCLUDE_WARNING,
    variantB: VARIANT_EXCLUDE_WARNING,
  }),
)(AMInstallButtonBase);

export default AMInstallButton;
