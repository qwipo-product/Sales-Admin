import { Pipe, PipeTransform } from '@angular/core';

import { ClusterType } from '../../../shared/models/enums';
import { capitalizeFirstLetter, getClusterTypeName } from '../../../shared/helpers/utils';

/**
 * Minified as `V0`. `{{ area.type | ClusterTypePipe }}` -> "General" | "Wholesale"
 * (getClusterTypeName: {1: 'general', 2: 'wholesale'}[type] || 'general', then capitalized).
 */
@Pipe({
  name: 'ClusterTypePipe',
})
export class ClusterTypePipe implements PipeTransform {
  transform(type: ClusterType = ClusterType.General): string {
    return capitalizeFirstLetter(getClusterTypeName(type));
  }
}
