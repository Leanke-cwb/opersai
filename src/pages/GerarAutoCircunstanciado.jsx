didDrawCell: (data) => {
  if (data.section === "body" && data.column.index === 5) {

    // ✅ GUARDA NECESSÁRIA (SÓ ISSO)
    if (
      !data.row ||
      data.row.index == null ||
      !itensComBase64[data.row.index] ||
      !Array.isArray(itensComBase64[data.row.index].base64Fotos)
    ) {
      return;
    }

    const fotos = itensComBase64[data.row.index].base64Fotos;

    if (fotos.length) {
      fotos.slice(0, 2).forEach((img, idx) => {
        const imgX =
          data.cell.x +
          photoPadding +
          idx * (photoSize + photoPadding);
        const imgY = data.cell.y + photoPadding;

        doc.addImage(img, "JPEG", imgX, imgY, photoSize, photoSize);
      });
    }
  }
},
