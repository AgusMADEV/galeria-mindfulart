const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

function convertToMp4(inputPath, outputPath) {

    return new Promise((resolve, reject) => {

        ffmpeg(inputPath)

            .videoCodec('libx264')
            .audioCodec('aac')

            .outputOptions([
                '-movflags +faststart',
                '-preset medium',
                '-crf 23'
            ])

            .on('end', () => {
                console.log('Conversión a MP4 completada');
                resolve();
            })

            .on('error', (error) => {
                console.error('Error convirtiendo vídeo:', error);
                reject(error);
            })

            .save(outputPath);

    });

}

module.exports = {
    convertToMp4
};