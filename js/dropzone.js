/**
 * @file
 * Drupal Dropzone integration.
 */

(function($) {

  /**
   * Drupal Dropzone Integration.
   */
  Drupal.behaviors.drupalDropzone = {

    attach: function (context, settings) {
      Dropzone.autoDiscover = false;

      $('.drupal-dropzone', context).parents('.form-wrapper').once('drupal-dropzone').each(function() {
        var dropzoneInstance;

        var $field = $(this);
        var $form = $(this).closest('form');
        var uploads = 0;

        var id = $(this).find('.file-dropzone-upload-button').attr('id');
        var options = Drupal.ajax[id].options;
        var beforeSerialize = options.beforeSerialize;

        var config = {
          url: options.url,
          paramName: 'files[dropzone_files]',
          addRemoveLinks: true,
          uploadMultiple: true,
          parallelUploads: 5,
          //previewsContainer: '',
        };

        /*if (dropzoneInstance) {
          dropzoneInstance.previewsContainer = $(config.previewsContainer).get(0);
        }*/

        $(this).addClass('dropzone')
        $(this).dropzone(config);

        dropzoneInstance = this.dropzone;

        dropzoneInstance.on('successmultiple', function(files, response) {
          var results = [];
          for (var i in response) {
            if (response.hasOwnProperty(i) && response[i]['command'] == 'dropzoneFiles') {
              results = response[i]['results'];
            }
          }
          if (results.length == 0) {
            // @todo emit error on all files
            return;
          }

          for (var i in results) {
            if (results[i].status == 201) {
              dropzoneInstance.removeFile(files[i]);
            }
            else {
              dropzoneInstance.emit("error", files[i], results[i].message, null);
              $(files[i].previewElement).find('[data-dz-errormessage]').html(results[i].message);
            }
          }

          var $previews = $field.find('.dz-preview').remove();

          options.success(response);
          $previews.appendTo($field);

          if (uploads > 0) {
            $field.find('.browse').parent().hide();
          }
        });

        dropzoneInstance.on('drop', function(e) {
          fid = e.dataTransfer.getData('fid');
          if (fid > 0) {
            var file = {
              'type': 'application/octet-stream',
              'dropzoneAction': 'attach',
              'name': 'Attach ' + e.dataTransfer.getData('name'),
              'size': 1,
              'fid': fid,
              'preview': e.dataTransfer.getData('preview'),
              'status': Dropzone.ACCEPTED
            };

            dropzoneInstance.addFile(file);
          }
        });

        dropzoneInstance.on('addedfile', function(file) {
          var fid = file.fid || 0;

          if (fid > 0 && file.preview) {
            var div = $('<div>').html(file.preview);
            var img = div.find('img').get(0);
            // Defer call.
            setTimeout( function() {
              dropzoneInstance.createThumbnailFromUrl(file, img.src);
            }, 0);
          }
        });

        dropzoneInstance.on('sendingmultiple', function(files, xhr, formData) {
          if (uploads == 0) {
            $field.find('.browse').parent().hide();
          }
          uploads++;

          // @todo
          beforeSerialize($form.get(0), options);

          var extraData = options.data;
          var data = $form.formToArray();

          for (var i=0; i < data.length; i++) {
            formData.append(data[i].name, data[i].value);
          }
          for (var property in extraData) {
            formData.append(property, extraData[property]);
          }
          xhr.url = options.url;

          for (var i=0; i < files.length; i++) {
            var fid = files[i].fid || 0;
            var $preview = $(files[i].previewElement);
            $preview.find('.dz-remove').text('');

            if (fid > 0) {
              var action = {
                'type': files[i].dropzoneAction,
                'fid': fid,
              };
              formData.append('dropzone_actions[]', JSON.stringify(action));
              $preview.find('.dz-size').text('');
            }
            else {
              var action = {
                'type': 'upload',
                'name': files[i].name,
              };

              formData.append('dropzone_actions[]', JSON.stringify(action));
            }
          }
        });

        dropzoneInstance.on('completemultiple', function(files, response) {
          uploads--;

          if (uploads == 0) {
            $field.find('.browse').parent().show();
          }
        });
      });

      $('.drupal-dropzone', context).parents('.form-wrapper').each(function() {
        var dropzoneInstance = this.dropzone;

        var $field = $(this);
        var $form = $(this).closest('form');

        // Add a handler for remove button.
        $('input.file-dropzone-remove-button', $field).unbind('mousedown').bind('mousedown', function(ev) {
          ev.preventDefault();

          var $row = $(this).closest('tr');
          var $table = $row.closest('table');
          var $input = $row.find('input.file-dropzone-fid');

          var previewHtml = null;
          var $preview = $row.find('.preview, .image-preview');
          if ($preview.length > 0) {
            previewHtml = $($preview.get(0)).html();
          }
          var label = 'file';

          var $label = $input.parent().find('label');
          if ($label.length == 0) {
            $label = $input.parent().find('.file > a');
          }
          if ($label.length > 0) {
            label = $label.text();
          }

          var file = {
            'type': 'application/octet-stream',
            'dropzoneAction': 'remove',
            'name': 'Remove ' + label,
            'size': 1,
            'fid': $input.attr('value'),
            'preview': previewHtml,
            'status': Dropzone.ACCEPTED
          };
          dropzoneInstance.addFile(file);

          // Update the table already to the new state.
          $row.remove();
          Drupal.tableDrag[$table.attr('id')].restripeTable();
        });

        $('input.file-dropzone-attach-button', $field).unbind('mousedown').bind('mousedown', function(ev) {
          ev.preventDefault();

          var $row = $(this).closest('tr');
          var $input = $row.find('input.file-dropzone-upload-fid');

          var file = {
            'type': 'application/octet-stream',
            'dropzoneAction': 'attach',
            'name': 'Attach file',
            'size': 1,
            'fid': $input.attr('value'),
            'status': Dropzone.ACCEPTED
          };

          dropzoneInstance.addFile(file);
        });

      });
    }
  }

})(jQuery);
