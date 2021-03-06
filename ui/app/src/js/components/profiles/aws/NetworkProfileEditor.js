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

export default Vue.component('aws-network-profile-editor', {
  template: `
    <div>
      <section class="form-block" v-if="endpoint">
        <label>{{i18n('app.profile.edit.generalLabel')}}</label>
        <multicolumn-editor-group
          :label="i18n('app.profile.edit.securityGroups')"
          :value="securityGroups"
          @change="onSecurityGroupChange">
          <multicolumn-cell name="name">
            <securitygroup-search
              :endpoint="endpoint"
              :fetch-additional-data="fetchVpcIds"
              :renderer="renderSecurityGroup">
            </securitygroup-search>
          </multicolumn-cell>
        </multicolumn-editor-group>
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
    let securityGroups = this.model.securityGroupStates &&
        this.model.securityGroupStates.asMutable() || [];
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
      securityGroups: securityGroups.map((securityGroup) => {
        return {
          name: securityGroup
        };
      })
    };
  },
  attached() {
    this.emitChange();
  },
  methods: {
    onSecurityGroupChange(value) {
      this.securityGroups = value;
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
    fetchVpcIds(result, resolve) {
      let vpcIds = result.items.reduce((previous, current) => {
        if (current.customProperties && current.customProperties.awsVpcId) {
          if (!previous.includes(current.customProperties.awsVpcId)) {
            previous = previous.concat(current.customProperties.awsVpcId);
          }
        }
        return previous;
      }, []);

      services.loadVpcs(vpcIds).then((vpcs) => {

        result.items.forEach((item) => {
          if (item.customProperties && item.customProperties.awsVpcId) {
            for (var vpcLink in vpcs) {
              if (vpcs[vpcLink].id === item.customProperties.awsVpcId) {
                item.vpcName = vpcs[vpcLink].name;
                break;
              }
            }
          }
        });
        resolve(result);
      });
    },
    renderSecurityGroup(securityGroup) {
      let secondary = i18n.t('app.profile.edit.vpc') + ': ' + securityGroup.vpcName;

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
    renderIsolationNetwork(network) {
      let secondary = i18n.t('app.profile.edit.cidrLabel') + ': ' +
          formatUtils.escapeHtml(network.subnetCIDR);
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
          resolve(result);
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
          securityGroupLinks: this.securityGroups.reduce((previous, current) => {
            if (current.name && current.name.documentSelfLink) {
              previous.push(current.name.documentSelfLink);
            }
            return previous;
          }, [])
        },
        valid: this.isolationType === ISOLATION_TYPES[0] ||
            (this.isolationType === ISOLATION_TYPES[1] &&
            this.isolationNetwork && this.isolatedSubnetCIDRPrefix) ||
            this.isolationType === ISOLATION_TYPES[2]
      });
    }
  }
});
