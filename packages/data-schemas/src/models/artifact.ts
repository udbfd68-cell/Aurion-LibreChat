import artifactSchema from '~/schema/artifact';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import type { IArtifact } from '~/types/artifact';

export function createArtifactModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(artifactSchema);
  return mongoose.models.Artifact || mongoose.model<IArtifact>('Artifact', artifactSchema);
}
