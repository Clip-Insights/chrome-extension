import { registerPlatform } from '@/core/platform/registry';
import { YouTubeAdapter } from './youtube/YouTubeAdapter';

/**
 * Register every supported platform adapter. Importing this module wires them
 * into the registry. To add a platform, implement its adapter and register it
 * here (and add its host pattern in manifest.config.ts). See ARCHITECTURE.md B.6.
 */
registerPlatform(new YouTubeAdapter());
// registerPlatform(new CourseraAdapter());
// registerPlatform(new DeepLearningAdapter());
