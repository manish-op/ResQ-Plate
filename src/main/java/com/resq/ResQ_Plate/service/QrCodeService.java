package com.resq.ResQ_Plate.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class QrCodeService {

    private static final int QR_WIDTH  = 300;
    private static final int QR_HEIGHT = 300;

    /**
     * Generates a QR code for the given content string and returns it
     * as a Base64-encoded PNG data URI: "data:image/png;base64,..."
     *
     * @param content The URL or text to encode (e.g. http://localhost:8080/api/qr/verify/{token})
     * @return Base64 PNG data URI safe to embed in an HTML img src attribute
     */
    public String generateQrCodeBase64(String content) {
        try {
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 2);

            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, QR_WIDTH, QR_HEIGHT, hints);

            BufferedImage image = MatrixToImageWriter.toBufferedImage(bitMatrix);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", baos);

            String base64 = Base64.getEncoder().encodeToString(baos.toByteArray());
            log.debug("QR code generated for content: {}", content);

            return "data:image/png;base64," + base64;

        } catch (WriterException | IOException e) {
            log.error("Failed to generate QR code for content [{}]: {}", content, e.getMessage(), e);
            throw new RuntimeException("QR code generation failed: " + e.getMessage(), e);
        }
    }
}
