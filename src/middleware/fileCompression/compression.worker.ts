import { parentPort } from 'worker_threads';
import { CompressionAlgorithms } from './algorithms';
import { AdaptiveCompression } from './adaptive';
import { QualityAnalyzer } from './quality';

parentPort?.on('message', async (message) => {
  try {
    const { inputPath, outputPath, options } = message;

    // Determine optimal compression settings
    const adaptiveOptions = await AdaptiveCompression.determineOptimalCompression(
      inputPath
    );

    // Merge adaptive options with user options
    const finalOptions = { ...adaptiveOptions, ...options };

    // Compress the file
    const result = await CompressionAlgorithms.compressDocument(
      inputPath,
      outputPath,
      finalOptions
    );

    // Analyze quality if it's an image
    if (options.analyzeQuality && finalOptions.format) {
      const qualityAnalysis = await QualityAnalyzer.analyzeImage(
        inputPath,
        outputPath
      );
      result.qualityAnalysis = qualityAnalysis;
    }

    parentPort?.postMessage(result);
  } catch (error) {
    parentPort?.postMessage({ error: error.message });
  }
}); 