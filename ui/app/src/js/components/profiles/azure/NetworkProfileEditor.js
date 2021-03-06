/*
 * Copyright (c) 2017 VMware, Inc. All Rights Reserved.
 *
 * This product is licensed to you under the Apache License, Version 2.0 (the "License").
 * You may not use this product except in compliance with the License.
 *
 * This product may include a number of subcomponents with separate copyright notices
 * and license terms. Your use of these subcomponents is subject to the terms and
 * conditions of the subcomponent's license, as noted in the LICENSE file.
 */

import services from 'core/services';
import { formatUtils } from 'admiral-ui-common';

const ISOLATION_TYPES = [{
  name: i18n.t('app.profile.edit.noneIsolationTypeLabel'),
  value: 'NONE'
}, {
  name: i18n.t('app.profile.edit.subnetIsolationTypeLabel'),
  value: 'SUBNET'
}, {
  name: i18n.t('app.profile.edit.securityGroupIsolationTypeLabel'),
  value: 'SECURITY_GROUP'
}];

export default Vue.component('azure-network-profile-editor', {
  template: `
    <div>
      <section class="form-block" v-if="endpoint">
        <label>{{i18n('app.profile.edit.generalLabel')}}</label>
        <dropdown-search-group
          :label="i18n('app.profile.edit.securityGroupIsolationTypeLabel')"
          :filter="searchSecurityGroups"
          :value="securityGroup"
          :renderer="renderSecurityGroup"
          @change="onSecurityGroupChange">
        </dropdown-search-group>
      </section>
      <section class="form-block" v-if="endpoint">
        <label>{{i18n('app.profile.edit.existingLabel')}}</label>
        <multicolumn-editor-group
          :label="i18n('app.profile.edit.subnetworksLabel')"
          :value="subnetworks"
          @change="onSubnetworkChange">
          <multicolumn-cell name="name">
            <subnetwork-search
              :endpoint="endpoint"
              :manage-action="manageSubnetworks">
            </subnetwork-search>
          </multicolumn-cell>
        </multicolumn-editor-group>
      </section>
      <section class="form-block" v-if="endpoint">
        <label>{{i18n('app.profile.edit.isolationLabel')}}</label>
        <select-group
          :label="i18n('app.profile.edit.isolationTypeLabel')"
          :options="isolationTypes"
          :value="isolationType"
          @change="onIsolationTypeChange">
        </select-group>
        <dropdown-search-group
          v-if="isolationType && isolationType.value === 'SUBNET'"
          :entity="i18n('app.network.entity')"
          :filter="searchIsolationNetworks"
          :label="i18n('app.profile.edit.isolationNetworkLabel')"
          :renderer="renderIsolationNetwork"
          :required="true"
          :value="isolationNetwork"
          @change="onIsolationNetworkChange">
        </dropdown-search-group>
        <number-group
          v-if="isolationType && isolationType.value === 'SUBNET'"
          :label="i18n('app.profile.edit.cidrPrefixLabel')"
          :required="true"
          :value="isolatedSubnetCIDRPrefix"
          @change="onIsolatedSubnetCIDRPrefixChange">
        </number-group>
      </section>
    </div>
  `,
  props: {
    endpoint: {
      required: false,
      type: Object
    },
    model: {
      required: true,
      type: Object
    }
  },
  data() {
    let subnetworks = this.model.subnetworks &&
        this.model.subnetworks.asMutable() || [];
    return {
      isolatedSubnetCIDRPrefix: this.model.isolatedSubnetCIDRPrefix,
      isolationNetwork: this.model.isolationNetwork,
      isolationType: ISOLATION_TYPES.find((type) => type.value === this.model.isolationType) ||
          ISOLATION_TYPES[0],
      isolationTypes: ISOLATION_TYPES,
      subnetworks: subnetworks.map((subnetwork) => {
        return {
          name: subnetwork
        };
      }),
      securityGroup: this.model.securityGroupStates && this.model.securityGroupStates.length > 0
          ? this.model.securityGroupStates[0] : null
    };
  },
  attached() {
    this.emitChange();
  },
  methods: {
    onSecurityGroupChange(value) {
      this.securityGroup = value;
      this.emitChange();
    },
    onSubnetworkChange(value) {
      this.subnetworks = value;
      this.emitChange();
    },
    onIsolationTypeChange(value) {
      this.isolationType = value;
      this.emitChange();
    },
    onIsolationNetworkChange(value) {
      this.isolationNetwork = value;
      this.emitChange();
    },
    onIsolatedSubnetCIDRPrefixChange(value) {
      this.isolatedSubnetCIDRPrefix = value;
      this.emitChange();
    },
    renderIsolationNetwork(network) {
      let secondary = i18n.t('app.profile.edit.cidrLabel') + ': ' +
          formatUtils.escapeHtml(network.subnetCIDR) + ', ' +
          i18n.t('app.profile.edit.resourceGroupsLabel') + ': ' +
          (network.groupNames ? formatUtils.escapeHtml(network.groupNames.join(', ')) : '');
      return `
        <div>
          <div class="host-picker-item-primary" title="${network.name}">
            ${formatUtils.escapeHtml(network.name)}
          </div>
          <div class="host-picker-item-secondary truncateText" title="${secondary}">
            ${secondary}
          </div>
        </div>`;
    },
    searchIsolationNetworks(...args) {
      return new Promise((resolve, reject) => {
        services.searchNetworks.apply(null,
            [this.endpoint.documentSelfLink, ...args]).then((result) => {
          let groupLinks = result.items.reduce((previous, current) => {
            if (current.groupLinks) {
              previous = previous.concat(current.groupLinks);
            }
            return previous;
          }, []);
          services.loadResourceGroups([...new Set(groupLinks)]).then((groups) => {
            result.items.forEach((item) => {
              if (item.groupLinks) {
                item.groupNames = item.groupLinks.map((groupLink) => {
                  return groups[groupLink].name;
                });
              }
            });
            resolve(result);
          });
        }).catch(reject);
      });
    },
    renderSecurityGroup(securityGroup) {
      let secondary = i18n.t('app.profile.edit.resourceGroupsLabel') + ': ' +
          (securityGroup.groupNames ?
           formatUtils.escapeHtml(securityGroup.groupNames.join(', ')) : '');
      return `
        <div>
          <div class="host-picker-item-primary" title="${securityGroup.name}">
            ${formatUtils.escapeHtml(securityGroup.name)}
          </div>
          <div class="host-picker-item-secondary truncateText" title="${secondary}">
            ${secondary}
          </div>
        </div>`;
    },
    searchSecurityGroups(...args) {
      return new Promise((resolve, reject) => {
        services.searchSecurityGroups.apply(null,
            [this.endpoint.documentSelfLink, ...args]).then((result) => {
          let groupLinks = result.items.reduce((previous, current) => {
            if (current.groupLinks) {
              previous = previous.concat(current.groupLinks);
            }
            return previous;
          }, []);
          services.loadResourceGroups([...new Set(groupLinks)]).then((groups) => {
            result.items.forEach((item) => {
              if (item.groupLinks) {
                item.groupNames = item.groupLinks.map((groupLink) => {
                  return groups[groupLink].name;
                });
              }
            });
            resolve(result);
          });
        }).catch(reject);
      });
    },
    manageSubnetworks() {
      this.$emit('manage.subnetworks');
    },
    emitChange() {
      this.$emit('change', {
        properties: {
          isolationType: this.isolationType && this.isolationType.value,
          isolationNetworkLink: this.isolationNetwork &&
              this.isolationNetwork.documentSelfLink,
          isolatedSubnetCIDRPrefix: this.isolatedSubnetCIDRPrefix,
          subnetLinks: this.subnetworks.reduce((previous, current) => {
            if (current.name && current.name.documentSelfLink) {
              previous.push(current.name.documentSelfLink);
            }
            return previous;
          }, []),
          securityGroupLinks: this.securityGroup ? [this.securityGroup.documentSelfLink] : []
        },
        valid: this.isolationType === ISOLATION_TYPES[0] ||
            (this.isolationType === ISOLATION_TYPES[1] &&
            this.isolationNetwork && this.isolatedSubnetCIDRPrefix) ||
            this.isolationType === ISOLATION_TYPES[2]
      });
    }
  }
});
