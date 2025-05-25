const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require("uuid");

module.exports = (sequelize) => {
  const Terms = sequelize.define("Terms", {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
      allowNull: false,
    },
    language: {
      type: DataTypes.STRING,  // ✅ corrected
      allowNull: false,
      validate: {
        isIn: [["en", "sv", "fr"]],
      },
    },
    section_key: {
      type: DataTypes.STRING,  // ✅ corrected
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // is_deleted: {
    //   type: DataTypes.BOOLEAN,
    //   defaultValue: false,
    //   allowNull: false,
    // }
  }, {
    tableName: 'terms',
    timestamps: true,
    indexes: [
      {
        fields: ['language', 'section_key'],
      },
      {
        fields: ['order_index'],
      }
    ]
  });

  return Terms;
};
